using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class BoardEndpoints
{
    public static void MapBoardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1").WithTags("Board").RequireAuthorization();

        group.MapGet("/projects/{projectId:guid}/boards", ListBoardsAsync);
        group.MapPost("/projects/{projectId:guid}/boards", CreateBoardAsync);
        group.MapPatch("/boards/{boardId:guid}", RenameBoardAsync);
        group.MapDelete("/boards/{boardId:guid}", DeleteBoardAsync);
        group.MapGet("/boards/{boardId:guid}", GetSnapshotAsync);
        group.MapPost("/boards/{boardId:guid}/mutations", ApplyMutationAsync)
            .RequireRateLimiting("board-mutation");
        group.MapGet("/projects/{projectId:guid}/item-trash", ListItemTrashAsync);
        group.MapPost("/projects/{projectId:guid}/item-trash/{itemId:guid}/restore", RestoreItemAsync);
        group.MapDelete("/projects/{projectId:guid}/item-trash/{itemId:guid}", PurgeItemAsync);
        group.MapDelete("/projects/{projectId:guid}/item-trash", EmptyItemTrashAsync);

        group.MapGet("/appearance", GetAppearanceAsync);
        group.MapPut("/appearance", PutAppearanceAsync);
        group.MapPut("/projects/{projectId:guid}/appearance", PutProjectAppearanceAsync);
    }

    // Delegates to ClaimsPrincipalExtensions.GetUserId, which returns 401 rather than
    // throwing (and 500-ing) on a token with a missing or malformed subject claim.
    private static Guid CurrentUserId(ClaimsPrincipal user) => user.GetUserId();

    private static async Task<Ok<List<BoardRecordDto>>> ListBoardsAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);

        var boards = await db.Boards.IgnoreQueryFilters().AsNoTracking()
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.SortOrder)
            .Select(b => new BoardRecordDto(b.Id, b.ProjectId, b.Name, b.SortOrder, b.Revision,
                b.CreatedAt, b.UpdatedAt, b.CreatedBy, b.UpdatedBy, b.DeletedAt))
            .ToListAsync(ct);

        return TypedResults.Ok(boards);
    }

    private static async Task<Ok<BoardRecordDto>> CreateBoardAsync(
        Guid projectId, CreateBoardRequest request, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length is < 1 or > 200)
            throw new ApiException(422, "invalid_name", "Board name must contain 1 to 200 characters.");
        var now = DateTimeOffset.UtcNow;
        var sortOrder = await db.Boards.Where(b => b.ProjectId == projectId).Select(b => (int?)b.SortOrder).MaxAsync(ct) ?? -1;
        var board = new Board
        {
            Id = Guid.CreateVersion7(), ProjectId = projectId, Name = name, SortOrder = sortOrder + 1,
            Revision = 1, CreatedAt = now, UpdatedAt = now, CreatedBy = userId, UpdatedBy = userId
        };
        db.Boards.Add(board);
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new BoardRecordDto(board.Id, board.ProjectId, board.Name, board.SortOrder,
            board.Revision, board.CreatedAt, board.UpdatedAt, board.CreatedBy, board.UpdatedBy, board.DeletedAt));
    }

    private static async Task<Ok<BoardRecordDto>> RenameBoardAsync(
        Guid boardId, RenameBoardRequest request, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var board = await db.Boards.FirstOrDefaultAsync(item => item.Id == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");
        await access.RequireAsync(board.ProjectId, userId, ProjectRole.Editor, ct);
        var name = request.Name?.Trim() ?? string.Empty;
        if (name.Length is < 1 or > 200)
            throw new ApiException(422, "invalid_name", "Board name must contain 1 to 200 characters.");
        board.Name = name;
        board.Revision++;
        board.UpdatedAt = DateTimeOffset.UtcNow;
        board.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new BoardRecordDto(board.Id, board.ProjectId, board.Name, board.SortOrder,
            board.Revision, board.CreatedAt, board.UpdatedAt, board.CreatedBy, board.UpdatedBy, board.DeletedAt));
    }

    private static async Task<NoContent> DeleteBoardAsync(
        Guid boardId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var board = await db.Boards.FirstOrDefaultAsync(item => item.Id == boardId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");
        await access.RequireAsync(board.ProjectId, userId, ProjectRole.Editor, ct);
        var isMain = await db.Boards.Where(item => item.ProjectId == board.ProjectId)
            .OrderBy(item => item.SortOrder).Select(item => item.Id).FirstAsync(ct) == boardId;
        if (isMain) throw new ApiException(409, "default_board", "The main board cannot be deleted.");
        db.Boards.Remove(board);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static async Task<Ok<BoardSnapshotDto>> GetSnapshotAsync(
        Guid boardId, ClaimsPrincipal principal, IProjectAccessService access,
        IBoardMutationService boards, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireForBoardAsync(boardId, userId, ProjectRole.Viewer, ct);

        return TypedResults.Ok(await boards.GetSnapshotAsync(boardId, ct));
    }

    /// <summary>
    /// The single write path for canvas data. Editor role or above — Viewers and Commenters
    /// get a 403 here even though they can read the same board.
    /// </summary>
    private static async Task<IResult> ApplyMutationAsync(
        Guid boardId, BoardMutationDto mutation, ClaimsPrincipal principal,
        IProjectAccessService access, IBoardMutationService boards, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireForBoardAsync(boardId, userId, ProjectRole.Editor, ct);

        var (status, result) = await boards.ApplyAsync(boardId, userId, mutation, ct);
        return status == 200 ? TypedResults.Ok(result) : TypedResults.Json(result, statusCode: status);
    }

    private static async Task<Ok<List<TrashedItemDto>>> ListItemTrashAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);
        var boards = await db.Boards.AsNoTracking().Where(b => b.ProjectId == projectId)
            .ToDictionaryAsync(b => b.Id, b => b.Name, ct);
        var boardIds = boards.Keys.ToList();
        var deleted = await db.BoardItems.IgnoreQueryFilters().AsNoTracking()
            .Where(i => boardIds.Contains(i.BoardId) && i.DeletedAt != null)
            .OrderByDescending(i => i.DeletedAt)
            .ToListAsync(ct);
        var deletedIds = deleted.Select(i => i.Id).ToHashSet();
        var roots = deleted.Where(i => i.ParentItemId is null || !deletedIds.Contains(i.ParentItemId.Value))
            .Select(i => new TrashedItemDto(ToItemDto(i), boards[i.BoardId]))
            .ToList();
        return TypedResults.Ok(roots);
    }

    private static async Task<Ok<BoardSnapshotDto>> RestoreItemAsync(
        Guid projectId, Guid itemId, RestoreTrashItemRequest request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, IBoardMutationService boardsService, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
        if ((request.X is { } x && !double.IsFinite(x)) || (request.Y is { } y && !double.IsFinite(y)))
            throw new ApiException(422, "invalid_position", "The restore position must be finite.");

        var projectBoards = await db.Boards.Where(b => b.ProjectId == projectId).ToListAsync(ct);
        var boardIds = projectBoards.Select(b => b.Id).ToHashSet();
        var targetBoard = projectBoards.FirstOrDefault(b => b.Id == request.TargetBoardId)
            ?? throw new ApiException(404, "not_found", "Target board not found.");
        var allItems = await db.BoardItems.IgnoreQueryFilters()
            .Where(i => boardIds.Contains(i.BoardId)).ToListAsync(ct);
        var root = allItems.FirstOrDefault(i => i.Id == itemId && i.DeletedAt != null)
            ?? throw new ApiException(404, "not_found", "Trashed item not found.");

        var restoreIds = new HashSet<Guid> { root.Id };
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var item in allItems.Where(i => i.DeletedAt != null && i.ParentItemId is not null))
                if (restoreIds.Contains(item.ParentItemId!.Value) && restoreIds.Add(item.Id)) changed = true;
        }

        var now = DateTimeOffset.UtcNow;
        var nextZ = await db.BoardItems.Where(i => i.BoardId == targetBoard.Id)
            .Select(i => (int?)i.ZIndex).MaxAsync(ct) ?? 0;
        var sourceBoardId = root.BoardId;
        foreach (var item in allItems.Where(i => restoreIds.Contains(i.Id)))
        {
            item.BoardId = targetBoard.Id;
            item.DeletedAt = null;
            item.Revision++;
            item.UpdatedAt = now;
            item.UpdatedBy = userId;
            if (item.Id == root.Id)
            {
                item.ParentItemId = null;
                item.FrameId = null;
                if (request.X is { } restoreX) item.PosX = restoreX;
                if (request.Y is { } restoreY) item.PosY = restoreY;
                item.ZIndex = item.Type == "frame" ? 0 : ++nextZ;
            }
            else if (item.FrameId is { } frameId && !restoreIds.Contains(frameId)) item.FrameId = null;
        }

        var validTargets = (await db.BoardItems.Where(i => i.BoardId == targetBoard.Id).Select(i => i.Id).ToListAsync(ct))
            .Concat(restoreIds).ToHashSet();
        var links = await db.ItemLinks.Where(l => restoreIds.Contains(l.SourceItemId)).ToListAsync(ct);
        db.ItemLinks.RemoveRange(links.Where(l => !validTargets.Contains(l.TargetItemId)));

        if (LinkedBoardId(root) is { } linkedBoardId)
        {
            var linkedBoard = await db.Boards.IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == linkedBoardId && b.ProjectId == projectId, ct);
            if (linkedBoard is not null)
            {
                linkedBoard.DeletedAt = null;
                linkedBoard.Revision++;
                linkedBoard.UpdatedAt = now;
                linkedBoard.UpdatedBy = userId;
            }
        }

        foreach (var board in projectBoards.Where(b => b.Id == sourceBoardId || b.Id == targetBoard.Id))
        {
            board.Revision++;
            board.UpdatedAt = now;
            board.UpdatedBy = userId;
        }
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(await boardsService.GetSnapshotAsync(targetBoard.Id, ct));
    }

    private static async Task<NoContent> PurgeItemAsync(
        Guid projectId, Guid itemId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
        var boardIds = await db.Boards.Where(b => b.ProjectId == projectId).Select(b => b.Id).ToListAsync(ct);
        var deleted = await db.BoardItems.IgnoreQueryFilters()
            .Where(i => boardIds.Contains(i.BoardId) && i.DeletedAt != null).ToListAsync(ct);
        var root = deleted.FirstOrDefault(i => i.Id == itemId)
            ?? throw new ApiException(404, "not_found", "Trashed item not found.");
        var ids = DescendantIds(deleted, root.Id);
        db.BoardItems.RemoveRange(deleted.Where(i => ids.Contains(i.Id)));
        if (LinkedBoardId(root) is { } linkedBoardId)
        {
            var linkedBoard = await db.Boards.IgnoreQueryFilters()
                .FirstOrDefaultAsync(b => b.Id == linkedBoardId && b.ProjectId == projectId, ct);
            if (linkedBoard is not null) db.Boards.Remove(linkedBoard);
        }
        await TouchBoardsAsync(db, [root.BoardId], userId, ct);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> EmptyItemTrashAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);
        var boardIds = await db.Boards.Where(b => b.ProjectId == projectId).Select(b => b.Id).ToListAsync(ct);
        var deleted = await db.BoardItems.IgnoreQueryFilters()
            .Where(i => boardIds.Contains(i.BoardId) && i.DeletedAt != null).ToListAsync(ct);
        var linkedBoardIds = deleted.Select(LinkedBoardId).OfType<Guid>().ToHashSet();
        var linkedBoards = linkedBoardIds.Count == 0
            ? new List<Board>()
            : await db.Boards.IgnoreQueryFilters()
                .Where(b => b.ProjectId == projectId && linkedBoardIds.Contains(b.Id)).ToListAsync(ct);
        db.Boards.RemoveRange(linkedBoards);
        db.BoardItems.RemoveRange(deleted.Where(item => !linkedBoardIds.Contains(item.BoardId)));
        await TouchBoardsAsync(db, deleted.Select(i => i.BoardId).Distinct(), userId, ct);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static HashSet<Guid> DescendantIds(IReadOnlyList<BoardItem> items, Guid rootId)
    {
        var ids = new HashSet<Guid> { rootId };
        var changed = true;
        while (changed)
        {
            changed = false;
            foreach (var item in items)
                if (item.ParentItemId is { } parentId && ids.Contains(parentId) && ids.Add(item.Id)) changed = true;
        }
        return ids;
    }

    private static Guid? LinkedBoardId(BoardItem item)
    {
        if (item.Type != "board") return null;
        using var document = System.Text.Json.JsonDocument.Parse(item.Data);
        return document.RootElement.TryGetProperty("boardId", out var value) &&
               value.ValueKind == System.Text.Json.JsonValueKind.String &&
               Guid.TryParse(value.GetString(), out var id)
            ? id
            : null;
    }

    private static async Task TouchBoardsAsync(
        AppDbContext db, IEnumerable<Guid> ids, Guid userId, CancellationToken ct)
    {
        var idSet = ids.ToHashSet();
        if (idSet.Count == 0) return;
        var now = DateTimeOffset.UtcNow;
        foreach (var board in await db.Boards.Where(b => idSet.Contains(b.Id)).ToListAsync(ct))
        {
            board.Revision++;
            board.UpdatedAt = now;
            board.UpdatedBy = userId;
        }
    }

    private static ItemRecordDto ToItemDto(BoardItem item) => new(
        item.Id, item.BoardId, item.ParentItemId, item.FrameId, item.SortOrder,
        item.PosX, item.PosY, item.Width, item.Height, item.ZIndex, item.Locked,
        item.Type, item.SchemaVersion,
        System.Text.Json.JsonDocument.Parse(item.Appearance).RootElement,
        System.Text.Json.JsonDocument.Parse(item.Data).RootElement,
        item.Revision, item.CreatedAt, item.UpdatedAt, item.CreatedBy, item.UpdatedBy, item.DeletedAt);

    // ---------------- appearance ----------------

    private static async Task<Ok<object>> GetAppearanceAsync(
        ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var profile = await db.AppearanceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId, ct);

        // Only overrides for projects the user can still see — a project they were removed
        // from shouldn't keep leaking its ID back through the theme payload.
        var overrides = await db.ProjectAppearanceOverrides.AsNoTracking()
            .Where(o => o.UserId == userId)
            .Where(o => db.Projects.Any(p => p.Id == o.ProjectId &&
                (p.OwnerId == userId || db.ProjectMembers.Any(m => m.ProjectId == p.Id && m.UserId == userId))))
            .ToListAsync(ct);

        // Shaped to match the frontend's existing appearance JSON exactly.
        return TypedResults.Ok<object>(new
        {
            defaults = profile is null ? null : new
            {
                font = profile.Font,
                mode = profile.Mode,
                light = System.Text.Json.JsonDocument.Parse(profile.LightTheme).RootElement,
                dark = System.Text.Json.JsonDocument.Parse(profile.DarkTheme).RootElement
            },
            projects = overrides.ToDictionary(
                o => o.ProjectId.ToString(),
                o => (object)new
                {
                    font = o.Font,
                    mode = o.Mode,
                    light = o.LightTheme is null ? null : (object)System.Text.Json.JsonDocument.Parse(o.LightTheme).RootElement,
                    dark = o.DarkTheme is null ? null : (object)System.Text.Json.JsonDocument.Parse(o.DarkTheme).RootElement
                }),
            uiFont = profile?.UiFont,
            uiPrimary = profile?.UiPrimary,
            uiSecondary = profile?.UiSecondary,
            inheritanceVersion = profile?.InheritanceVersion,
            paletteVersion = profile?.PaletteVersion
        });
    }

    private static async Task<NoContent> PutAppearanceAsync(
        AppearanceUpdateDto request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var profile = await db.AppearanceProfiles.FirstOrDefaultAsync(a => a.UserId == userId, ct);
        if (profile is null)
        {
            profile = new AppearanceProfile { UserId = userId };
            db.AppearanceProfiles.Add(profile);
        }

        profile.Font = request.Font;
        profile.Mode = request.Mode;
        profile.UiFont = request.UiFont;
        profile.UiPrimary = request.UiPrimary;
        profile.UiSecondary = request.UiSecondary;
        profile.InheritanceVersion = request.InheritanceVersion;
        profile.PaletteVersion = request.PaletteVersion;
        profile.LightTheme = request.Light.GetRawText();
        profile.DarkTheme = request.Dark.GetRawText();
        profile.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    /// <summary>
    /// Per-project theme override. Note this is Viewer-level, not Editor: a theme override
    /// is the caller's own private preference row, not a change to the shared project.
    /// </summary>
    private static async Task<NoContent> PutProjectAppearanceAsync(
        Guid projectId, ProjectAppearanceUpdateDto request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);

        var entity = await db.ProjectAppearanceOverrides
            .FirstOrDefaultAsync(o => o.UserId == userId && o.ProjectId == projectId, ct);

        if (entity is null)
        {
            entity = new ProjectAppearanceOverride
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                ProjectId = projectId
            };
            db.ProjectAppearanceOverrides.Add(entity);
        }

        entity.Font = request.Font;
        entity.Mode = request.Mode;
        entity.LightTheme = request.Light?.GetRawText();
        entity.DarkTheme = request.Dark?.GetRawText();
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}
