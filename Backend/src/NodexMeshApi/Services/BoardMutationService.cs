using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public interface IBoardMutationService
{
    Task<BoardSnapshotDto> GetSnapshotAsync(Guid boardId, CancellationToken ct = default);
    Task<(int Status, BoardMutationResultDto Result)> ApplyAsync(
        Guid boardId, Guid userId, BoardMutationDto mutation, CancellationToken ct = default);
}

/// <summary>
/// Applies a batch of board changes in one transaction, mirroring the frontend's
/// BoardMutation contract: a board-level revision check, per-item optimistic concurrency,
/// and full replacement of each touched item's links/tags/comments.
/// </summary>
public sealed class BoardMutationService(AppDbContext db, ILogger<BoardMutationService> logger)
    : IBoardMutationService
{
    private static readonly TimeSpan IdempotencyTtl = TimeSpan.FromHours(24);

    public async Task<BoardSnapshotDto> GetSnapshotAsync(Guid boardId, CancellationToken ct = default)
    {
        var board = await db.Boards.AsNoTracking().FirstOrDefaultAsync(b => b.Id == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");

        var items = await db.BoardItems.AsNoTracking().Where(i => i.BoardId == boardId).ToListAsync(ct);
        // Keep relation filtering in SQL instead of sending every item ID back as a parameter.
        var itemIds = db.BoardItems.Where(i => i.BoardId == boardId).Select(i => i.Id);

        var links = await db.ItemLinks.AsNoTracking()
            .Where(l => itemIds.Contains(l.SourceItemId)).ToListAsync(ct);
        var comments = await db.Comments.AsNoTracking()
            .Where(c => itemIds.Contains(c.ItemId)).ToListAsync(ct);
        var itemTags = await db.ItemTags.AsNoTracking()
            .Where(t => itemIds.Contains(t.ItemId)).ToListAsync(ct);
        var tags = await db.Tags.AsNoTracking()
            .Where(t => t.ProjectId == board.ProjectId).ToListAsync(ct);

        return new BoardSnapshotDto(
            ToDto(board),
            items.Select(ToDto).ToList(),
            links.Select(l => new ItemLinkDto(l.SourceItemId, l.TargetItemId, ToWireKind(l.Kind))).ToList(),
            comments.Select(ToDto).ToList(),
            tags.Select(t => new TagRecordDto(t.Id, t.ProjectId, t.Name, t.NormalizedName)).ToList(),
            itemTags.Select(t => new ItemTagDto(t.ItemId, t.TagId)).ToList());
    }

    public Task<(int Status, BoardMutationResultDto Result)> ApplyAsync(
        Guid boardId, Guid userId, BoardMutationDto mutation, CancellationToken ct = default)
    {
        // EnableRetryOnFailure requires the entire explicit transaction to run inside
        // the execution strategy. Re-read idempotency and revisions on each attempt.
        return db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            return await ApplyOnceAsync(boardId, userId, mutation, ct);
        });
    }

    private async Task<(int Status, BoardMutationResultDto Result)> ApplyOnceAsync(
        Guid boardId, Guid userId, BoardMutationDto mutation, CancellationToken ct)
    {
        var requestHash = HashRequest(mutation);

        // --- 1. Idempotency: replay a previous response rather than reapplying ---
        var existingKey = await db.IdempotencyKeys
            .AsNoTracking()
            .FirstOrDefaultAsync(k => k.ClientMutationId == mutation.ClientMutationId, ct);

        if (existingKey is not null && existingKey.ExpiresAt > DateTimeOffset.UtcNow)
        {
            // Same key with a *different* body is a client bug or a replay attack — never
            // silently apply it under a key that already means something else.
            if (existingKey.UserId != userId || existingKey.RequestHash != requestHash)
                throw new ApiException(409, "idempotency_conflict",
                    "This mutation ID was already used with a different request.");

            var replayed = JsonSerializer.Deserialize<BoardMutationResultDto>(existingKey.ResponseBody)!;
            return (existingKey.ResponseStatus, replayed);
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var board = await db.Boards.FirstOrDefaultAsync(b => b.Id == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");

        // --- 2. Board-level revision gate ---
        if (board.Revision != mutation.ExpectedBoardRevision)
        {
            await tx.RollbackAsync(ct);
            return (409, new BoardMutationResultDto(board.Revision, [],
                [new ConflictDto(board.Id, board.Revision, "revision_mismatch")]));
        }

        var touchedIds = mutation.Upserts.Select(u => u.Item.Id)
            .Concat(mutation.Deletes.Select(d => d.Id)).ToHashSet();

        var existing = await db.BoardItems
            .Where(i => i.BoardId == boardId && touchedIds.Contains(i.Id))
            .ToDictionaryAsync(i => i.Id, ct);

        var conflicts = new List<ConflictDto>();

        // --- 3. Collect all conflicts before mutating anything ---
        foreach (var upsert in mutation.Upserts)
        {
            if (upsert.ExpectedRevision is null)
            {
                // Insert: the ID must not already exist.
                if (existing.ContainsKey(upsert.Item.Id))
                    conflicts.Add(new ConflictDto(upsert.Item.Id, existing[upsert.Item.Id].Revision, "revision_mismatch"));
            }
            else if (!existing.TryGetValue(upsert.Item.Id, out var current))
            {
                conflicts.Add(new ConflictDto(upsert.Item.Id, null, "not_found"));
            }
            else if (current.Revision != upsert.ExpectedRevision.Value)
            {
                conflicts.Add(new ConflictDto(upsert.Item.Id, current.Revision, "revision_mismatch"));
            }
        }

        foreach (var delete in mutation.Deletes)
        {
            if (!existing.TryGetValue(delete.Id, out var current))
                conflicts.Add(new ConflictDto(delete.Id, null, "not_found"));
            else if (current.Revision != delete.ExpectedRevision)
                conflicts.Add(new ConflictDto(delete.Id, current.Revision, "revision_mismatch"));
        }

        if (conflicts.Count > 0)
        {
            await tx.RollbackAsync(ct);
            return (409, new BoardMutationResultDto(board.Revision, [], conflicts));
        }

        // --- 4. Validate against the referenced subgraph, not the whole 20k-item board ---
        await ValidateAgainstGraphAsync(boardId, mutation, existing, ct);

        // Tags are project-scoped UUIDs, never arbitrary foreign-key references.
        var requestedTags = new HashSet<Guid>();
        foreach (var upsert in mutation.Upserts)
        {
            if (upsert.Tags is null || upsert.Tags.Count > 100)
                throw new ApiException(422, "invalid_tag", "An item may have at most 100 tags.");
            foreach (var value in upsert.Tags)
            {
                if (!Guid.TryParse(value, out var tagId))
                    throw new ApiException(422, "invalid_tag", "Invalid tag ID.");
                requestedTags.Add(tagId);
            }
        }
        if (requestedTags.Count > 0 && await db.Tags.CountAsync(
            t => t.ProjectId == board.ProjectId && requestedTags.Contains(t.Id), ct) != requestedTags.Count)
            throw new ApiException(422, "invalid_tag", "Tags must belong to this project.");

        // --- 5. Apply ---
        var now = DateTimeOffset.UtcNow;
        var written = new List<BoardItem>();

        foreach (var upsert in mutation.Upserts)
        {
            var dto = upsert.Item;
            if (!existing.TryGetValue(dto.Id, out var entity))
            {
                entity = new BoardItem
                {
                    Id = dto.Id,
                    BoardId = boardId,
                    CreatedAt = now,
                    CreatedBy = userId,
                    Revision = 0
                };
                db.BoardItems.Add(entity);
            }

            entity.ParentItemId = dto.ParentItemId;
            entity.FrameId = dto.FrameId;
            entity.Type = dto.Type;
            entity.SchemaVersion = dto.SchemaVersion;
            entity.SortOrder = dto.SortOrder;
            entity.PosX = dto.X;
            entity.PosY = dto.Y;
            entity.Width = dto.Width;
            entity.Height = dto.Height;
            entity.ZIndex = dto.ZIndex;
            entity.Locked = dto.Locked;
            entity.Appearance = dto.Appearance.GetRawText();
            entity.Data = dto.Data.GetRawText();
            entity.Revision += 1;
            entity.UpdatedAt = now;
            entity.UpdatedBy = userId;
            entity.DeletedAt = null;

            await ReplaceRelationsAsync(entity, upsert, userId, now, ct);
            written.Add(entity);
        }

        foreach (var delete in mutation.Deletes)
        {
            var entity = existing[delete.Id];
            entity.DeletedAt = now;      // soft delete — restorable from the trash bin
            entity.Revision += 1;
            entity.UpdatedAt = now;
            entity.UpdatedBy = userId;
        }

        board.Revision += 1;
        board.UpdatedAt = now;
        board.UpdatedBy = userId;

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Another writer slipped in between our read and our write. The client retries
            // with the same clientMutationId; nothing was persisted, so that's safe.
            await tx.RollbackAsync(ct);
            logger.LogInformation("Concurrent write on board {BoardId}", boardId);
            return (409, new BoardMutationResultDto(board.Revision, [],
                [new ConflictDto(boardId, null, "revision_mismatch")]));
        }

        var result = new BoardMutationResultDto(board.Revision, written.Select(ToDto).ToList(), []);

        db.IdempotencyKeys.Add(new IdempotencyKey
        {
            ClientMutationId = mutation.ClientMutationId,
            UserId = userId,
            Endpoint = $"POST /api/v1/boards/{boardId}/mutations",
            RequestHash = requestHash,
            ResponseStatus = 200,
            ResponseBody = JsonSerializer.Serialize(result),
            CreatedAt = now,
            ExpiresAt = now.Add(IdempotencyTtl)
        });
        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);
        return (200, result);
    }

    /// <summary>
    /// Builds the validation context from the touched items plus everything they reference
    /// (parents, frames, link endpoints) — so nesting/frame/link rules are enforced without
    /// loading all 20,000 rows on every save.
    /// </summary>
    private async Task ValidateAgainstGraphAsync(
        Guid boardId,
        BoardMutationDto mutation,
        Dictionary<Guid, BoardItem> existing,
        CancellationToken ct)
    {
        var referenced = new HashSet<Guid>();
        foreach (var u in mutation.Upserts)
        {
            if (u.Item.ParentItemId is { } p) referenced.Add(p);
            if (u.Item.FrameId is { } f) referenced.Add(f);
            foreach (var l in u.Links) { referenced.Add(l.SourceItemId); referenced.Add(l.TargetItemId); }
        }

        var missing = referenced.Where(id => !existing.ContainsKey(id)).ToList();
        var extra = missing.Count == 0
            ? []
            : await db.BoardItems.AsNoTracking()
                .Where(i => i.BoardId == boardId && missing.Contains(i.Id))
                .Select(i => new ItemGraphNode(i.Id, i.Type, i.ParentItemId))
                .ToListAsync(ct);

        var context = new Dictionary<Guid, ItemGraphNode>();
        foreach (var node in extra) context[node.Id] = node;
        foreach (var (id, item) in existing) context[id] = new ItemGraphNode(id, item.Type, item.ParentItemId);
        // Items in this batch override their stored versions — validate the *resulting* state.
        foreach (var u in mutation.Upserts)
            context[u.Item.Id] = new ItemGraphNode(u.Item.Id, u.Item.Type, u.Item.ParentItemId);
        foreach (var d in mutation.Deletes) context.Remove(d.Id);

        var totalItems = await db.BoardItems.CountAsync(i => i.BoardId == boardId, ct);
        var newItems = mutation.Upserts.Count(u => !existing.ContainsKey(u.Item.Id));
        if (totalItems + newItems > BoardValidator.MaxItemsPerBoard)
            throw new ApiException(422, "board_limit", "The board item limit has been reached.");

        BoardValidator.ValidateGraph(
            boardId, context,
            mutation.Upserts.Select(u => u.Item),
            mutation.Upserts.SelectMany(u => u.Links));
    }

    /// <summary>
    /// "Relations are replaced only for the touched item, inside the same transaction"
    /// (records.ts). Preserve unchanged tag associations so EF never tracks two
    /// instances with the same composite key during an ordinary item edit.
    /// </summary>
    private async Task ReplaceRelationsAsync(
        BoardItem entity, ItemMutationDto upsert, Guid userId, DateTimeOffset now, CancellationToken ct)
    {
        var oldLinks = await db.ItemLinks.Where(l => l.SourceItemId == entity.Id).ToListAsync(ct);
        db.ItemLinks.RemoveRange(oldLinks);
        foreach (var link in upsert.Links)
        {
            db.ItemLinks.Add(new ItemLink
            {
                Id = Guid.CreateVersion7(),
                SourceItemId = link.SourceItemId,
                TargetItemId = link.TargetItemId,
                Kind = ParseKind(link.Kind)
            });
        }

        var oldTags = await db.ItemTags.Where(t => t.ItemId == entity.Id).ToListAsync(ct);
        var desiredTags = upsert.Tags.Select(Guid.Parse).ToHashSet();
        var oldTagIds = oldTags.Select(t => t.TagId).ToHashSet();
        db.ItemTags.RemoveRange(oldTags.Where(t => !desiredTags.Contains(t.TagId)));
        foreach (var tagId in desiredTags.Except(oldTagIds))
            db.ItemTags.Add(new ItemTag { ItemId = entity.Id, TagId = tagId });

        var existingComments = await db.Comments.Where(c => c.ItemId == entity.Id).ToDictionaryAsync(c => c.Id, ct);
        var keptIds = upsert.Comments.Select(c => c.Id).ToHashSet();

        foreach (var (id, comment) in existingComments.Where(c => !keptIds.Contains(c.Key)))
        {
            comment.DeletedAt = now;
            comment.Revision += 1;
            comment.UpdatedAt = now;
            comment.UpdatedBy = userId;
        }

        foreach (var dto in upsert.Comments)
        {
            if (existingComments.TryGetValue(dto.Id, out var comment))
            {
                comment.Text = dto.Text;
                comment.Status = ParseStatus(dto.Status);
                comment.Revision += 1;
                comment.UpdatedAt = now;
                comment.UpdatedBy = userId;
            }
            else
            {
                db.Comments.Add(new Comment
                {
                    Id = dto.Id,
                    ItemId = entity.Id,
                    AuthorId = userId,
                    Text = dto.Text,
                    Status = ParseStatus(dto.Status),
                    Revision = 1,
                    CreatedAt = now,
                    UpdatedAt = now,
                    CreatedBy = userId,
                    UpdatedBy = userId
                });
            }
        }
    }

    // ---- mapping helpers ----
    private static string HashRequest(BoardMutationDto mutation) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(mutation))));

    private static ItemLinkKind ParseKind(string kind) => kind switch
    {
        "line_start" => ItemLinkKind.LineStart,
        "line_end" => ItemLinkKind.LineEnd,
        "created_from" => ItemLinkKind.CreatedFrom,
        _ => throw new ApiException(422, "invalid_link", "Invalid item link.")
    };

    private static string ToWireKind(ItemLinkKind kind) => kind switch
    {
        ItemLinkKind.LineStart => "line_start",
        ItemLinkKind.LineEnd => "line_end",
        _ => "created_from"
    };

    private static CommentStatus ParseStatus(string status) => status switch
    {
        "open" => CommentStatus.Open,
        "todo" => CommentStatus.Todo,
        "in-progress" => CommentStatus.InProgress,
        "resolved" => CommentStatus.Resolved,
        _ => throw new ApiException(422, "invalid_comment", "Invalid comment status.")
    };

    private static string ToWireStatus(CommentStatus status) => status switch
    {
        CommentStatus.Open => "open",
        CommentStatus.Todo => "todo",
        CommentStatus.InProgress => "in-progress",
        _ => "resolved"
    };

    private static ItemRecordDto ToDto(BoardItem i) => new(
        i.Id, i.BoardId, i.ParentItemId, i.FrameId, i.SortOrder, i.PosX, i.PosY, i.Width, i.Height,
        i.ZIndex, i.Locked, i.Type, i.SchemaVersion,
        JsonDocument.Parse(i.Appearance).RootElement, JsonDocument.Parse(i.Data).RootElement,
        i.Revision, i.CreatedAt, i.UpdatedAt, i.CreatedBy, i.UpdatedBy, i.DeletedAt);

    private static BoardRecordDto ToDto(Models.Board b) => new(
        b.Id, b.ProjectId, b.Name, b.SortOrder, b.Revision,
        b.CreatedAt, b.UpdatedAt, b.CreatedBy, b.UpdatedBy, b.DeletedAt);

    private static CommentRecordDto ToDto(Comment c) => new(
        c.Id, c.ItemId, c.Text, ToWireStatus(c.Status), c.Revision,
        c.CreatedAt, c.UpdatedAt, c.CreatedBy, c.UpdatedBy, c.DeletedAt);
}
