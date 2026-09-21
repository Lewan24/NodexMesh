using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class BoardMutationServiceTests : IDisposable
{
    private readonly SqliteInMemoryDb _db = new();

    public void Dispose() => _db.Dispose();

    private static JsonElement EmptyObject() => JsonDocument.Parse("{}").RootElement;
    private static JsonElement NoteData(string content = "hello") =>
        JsonSerializer.SerializeToElement(new { content });

    private async Task<(Guid ProjectId, Guid BoardId, Guid OwnerId)> SeedBoardAsync()
    {
        var ownerId = Guid.NewGuid();
        var projectId = Guid.NewGuid();
        var boardId = Guid.NewGuid();
        using var context = _db.CreateContext();
        context.Projects.Add(new Project
        {
            Id = projectId, OwnerId = ownerId, Name = "Board project",
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId
        });
        context.Boards.Add(new Board
        {
            Id = boardId, ProjectId = projectId, Name = "Board", Revision = 1,
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId
        });
        await context.SaveChangesAsync();
        return (projectId, boardId, ownerId);
    }

    private static BoardMutationService CreateService(AppDbContext context, PresenceRegistry? presence = null) =>
        new(context, NullLogger<BoardMutationService>.Instance, presence ?? new PresenceRegistry());

    private static ItemMutationDto InsertOf(Guid itemId, Guid boardId, string content = "hello") =>
        new(
            new ItemWriteDto(itemId, boardId, null, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData(content)),
            ExpectedRevision: null, Links: [], Comments: [], Tags: []);

    private static ItemMutationDto UpdateOf(Guid itemId, Guid boardId, long expectedRevision, string content = "updated") =>
        new(
            new ItemWriteDto(itemId, boardId, null, null, 0, 10, 10, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData(content)),
            ExpectedRevision: expectedRevision, Links: [], Comments: [], Tags: []);

    // ---------------- snapshot ----------------

    [Fact]
    public async Task GetSnapshotAsync_Throws404_ForAMissingBoard()
    {
        var service = CreateService(_db.CreateContext());
        var act = () => service.GetSnapshotAsync(Guid.NewGuid());

        (await act.Should().ThrowAsync<ApiException>()).Which.StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task GetSnapshotAsync_ReturnsTheBoardWithNoItems_WhenEmpty()
    {
        var (_, boardId, _) = await SeedBoardAsync();
        var service = CreateService(_db.CreateContext());

        var snapshot = await service.GetSnapshotAsync(boardId);

        snapshot.Board.Id.Should().Be(boardId);
        snapshot.Items.Should().BeEmpty();
    }

    // ---------------- insert ----------------

    [Fact]
    public async Task ApplyAsync_InsertsANewItem_AndIncrementsBoardRevision()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        var mutation = new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []);

        var (status, result) = await service.ApplyAsync(boardId, ownerId, mutation);

        status.Should().Be(200);
        result.BoardRevision.Should().Be(2);
        result.Items.Should().ContainSingle(i => i.Id == itemId && i.Revision == 1);
        result.Conflicts.Should().BeEmpty();
    }

    [Fact]
    public async Task ApplyAsync_RejectsInsertWithAnIdThatAlreadyExists()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        // Second "insert" (ExpectedRevision: null) of the same id is a conflict, not a silent overwrite.
        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [InsertOf(itemId, boardId, "different content")], []));

        status.Should().Be(409);
        result.Conflicts.Should().ContainSingle(c => c.Id == itemId && c.Reason == "revision_mismatch");
    }

    // ---------------- update / concurrency ----------------

    [Fact]
    public async Task ApplyAsync_UpdatesAnExistingItem_WhenRevisionMatches()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [UpdateOf(itemId, boardId, expectedRevision: 1)], []));

        status.Should().Be(200);
        result.Items.Single().Revision.Should().Be(2);
    }

    [Fact]
    public async Task ApplyAsync_RejectsUpdate_WhenExpectedRevisionIsStale()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        // Claims to be updating from revision 99, but the item is actually at revision 1.
        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [UpdateOf(itemId, boardId, expectedRevision: 99)], []));

        status.Should().Be(409);
        var conflict = result.Conflicts.Should().ContainSingle().Which;
        conflict.Reason.Should().Be("revision_mismatch");
        conflict.CurrentRevision.Should().Be(1); // lets the client reconcile against real state
    }

    [Fact]
    public async Task ApplyAsync_RejectsUpdate_ForAnItemThatDoesNotExist()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);

        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 1, [UpdateOf(Guid.NewGuid(), boardId, expectedRevision: 1)], []));

        status.Should().Be(409);
        result.Conflicts.Should().ContainSingle(c => c.Reason == "not_found");
    }

    [Fact]
    public async Task ApplyAsync_RejectsWholeBatch_WhenBoardRevisionIsStale()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);

        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), ExpectedBoardRevision: 999, [InsertOf(Guid.NewGuid(), boardId)], []));

        status.Should().Be(409);
        result.Conflicts.Should().ContainSingle(c => c.Reason == "revision_mismatch");
        result.Items.Should().BeEmpty(); // all-or-nothing: nothing applied on a board-level conflict
    }

    // ---------------- delete ----------------

    [Fact]
    public async Task ApplyAsync_SoftDeletesAnItem_OnMatchingRevision()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        var (status, _) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [], [new ItemDeleteDto(itemId, 1)]));

        status.Should().Be(200);
        var stored = await context.BoardItems.IgnoreQueryFilters().SingleAsync(i => i.Id == itemId);
        stored.DeletedAt.Should().NotBeNull(); // soft delete, restorable — the row still exists
    }

    [Fact]
    public async Task ApplyAsync_RestoresASoftDeletedItem_WhenUndoUpsertsTheOriginalId()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));
        await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [], [new ItemDeleteDto(itemId, 1)]));

        var (status, result) = await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 3, [InsertOf(itemId, boardId, "restored")], []));

        status.Should().Be(200);
        result.Conflicts.Should().BeEmpty();
        var stored = await context.BoardItems.SingleAsync(i => i.Id == itemId);
        stored.DeletedAt.Should().BeNull();
        stored.Revision.Should().Be(3);
    }

    [Fact]
    public async Task ApplyAsync_SoftDeletesAndRestoresTheBoardLinkedByABoardCard()
    {
        var (projectId, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var childBoardId = Guid.NewGuid();
        context.Boards.Add(new Board
        {
            Id = childBoardId, ProjectId = projectId, Name = "Child", SortOrder = 1, Revision = 1,
            CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow,
            CreatedBy = ownerId, UpdatedBy = ownerId
        });
        await context.SaveChangesAsync();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        var boardCard = new ItemMutationDto(
            new ItemWriteDto(itemId, boardId, null, null, 0, 0, 0, 240, 140, 1, false,
                "board", 1, EmptyObject(), JsonSerializer.SerializeToElement(new
                {
                    boardId = childBoardId, title = "Child", description = "", icon = ""
                })),
            null, [], [], []);

        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [boardCard], []));
        await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [], [new ItemDeleteDto(itemId, 1)]));
        (await context.Boards.IgnoreQueryFilters().SingleAsync(b => b.Id == childBoardId))
            .DeletedAt.Should().NotBeNull();

        await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 3, [boardCard], []));
        (await context.Boards.SingleAsync(b => b.Id == childBoardId)).DeletedAt.Should().BeNull();
    }

    // ---------------- idempotency ----------------

    [Fact]
    public async Task ApplyAsync_ReplaysTheSameResult_WhenTheSameClientMutationIdIsResubmitted()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        var clientMutationId = Guid.NewGuid();
        var mutation = new BoardMutationDto(clientMutationId, 1, [InsertOf(itemId, boardId)], []);

        var first = await service.ApplyAsync(boardId, ownerId, mutation);
        var replay = await service.ApplyAsync(boardId, ownerId, mutation); // identical retry, e.g. a network timeout resend

        replay.Status.Should().Be(first.Status);
        replay.Result.BoardRevision.Should().Be(first.Result.BoardRevision);

        // Crucially: the mutation was NOT applied twice — board revision only moved once.
        var board = await context.Boards.SingleAsync(b => b.Id == boardId);
        board.Revision.Should().Be(2);
    }

    [Fact]
    public async Task ApplyAsync_Rejects_WhenClientMutationIdIsReusedWithADifferentBody()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var clientMutationId = Guid.NewGuid();
        await service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(clientMutationId, 1, [InsertOf(Guid.NewGuid(), boardId, "first")], []));

        var act = () => service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(clientMutationId, 1, [InsertOf(Guid.NewGuid(), boardId, "second, different")], []));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("idempotency_conflict");
    }

    // ---------------- cross-board / IDOR ----------------

    [Fact]
    public async Task ApplyAsync_RejectsAnItemIdThatBelongsToAnotherBoard()
    {
        var (_, boardAId, ownerId) = await SeedBoardAsync();
        var (_, boardBId, _) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var foreignItemId = Guid.NewGuid();
        await service.ApplyAsync(boardAId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(foreignItemId, boardAId)], []));

        // Attempting to "insert" that same id scoped to board B must be rejected, not
        // silently move the item cross-board (IDOR / broken object-level access).
        var (status, result) = await service.ApplyAsync(boardBId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(foreignItemId, boardBId)], []));

        status.Should().Be(409);
        result.Conflicts.Should().ContainSingle(c => c.Id == foreignItemId && c.Reason == "invalid_scope");
    }

    // ---------------- tags ----------------

    [Fact]
    public async Task ApplyAsync_RejectsATagIdThatDoesNotBelongToTheProject()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var foreignTagId = Guid.NewGuid(); // never created for this project
        var item = new ItemMutationDto(
            new ItemWriteDto(Guid.NewGuid(), boardId, null, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData()),
            null, [], [], [foreignTagId.ToString()]);

        var act = () => service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [item], []));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_tag");
    }

    [Fact]
    public async Task ApplyAsync_RejectsMalformedTagIds()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);
        var item = new ItemMutationDto(
            new ItemWriteDto(Guid.NewGuid(), boardId, null, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData()),
            null, [], [], ["not-a-guid"]);

        var act = () => service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [item], []));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_tag");
    }

    [Fact]
    public async Task ApplyAsync_AcceptsATagThatBelongsToTheProject()
    {
        var (projectId, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var tag = new Tag { Id = Guid.NewGuid(), ProjectId = projectId, Name = "Urgent", NormalizedName = "urgent" };
        context.Tags.Add(tag);
        await context.SaveChangesAsync();

        var service = CreateService(context);
        var itemId = Guid.NewGuid();
        var item = new ItemMutationDto(
            new ItemWriteDto(itemId, boardId, null, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData()),
            null, [], [], [tag.Id.ToString()]);

        var (status, _) = await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [item], []));

        status.Should().Be(200);
        (await context.ItemTags.SingleAsync()).TagId.Should().Be(tag.Id);
    }

    // ---------------- graph validation ----------------

    [Fact]
    public async Task ApplyAsync_RejectsInvalidColumnNesting()
    {
        var (_, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var service = CreateService(context);

        // ParentItemId points at a frame, not a column — invalid per BoardValidator.ValidateGraph.
        var frameId = Guid.NewGuid();
        var frameItem = new ItemMutationDto(
            new ItemWriteDto(frameId, boardId, null, null, 0, 0, 0, 500, 500, 0, false,
                "frame", 1, EmptyObject(), JsonSerializer.SerializeToElement(new { title = "F" })),
            null, [], [], []);
        var noteItem = new ItemMutationDto(
            new ItemWriteDto(Guid.NewGuid(), boardId, frameId, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), NoteData()),
            null, [], [], []);

        var act = () => service.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 1, [frameItem, noteItem], []));

        (await act.Should().ThrowAsync<ApiException>()).Which.Code.Should().Be("invalid_parent");
    }

    // ---------------- presence locking ----------------

    [Fact]
    public async Task ApplyAsync_RejectsMutationOfAnItemLockedByAnotherCollaborator()
    {
        var (projectId, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var itemId = Guid.NewGuid();
        var presetUpsertService = CreateService(context);
        await presetUpsertService.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        var presence = new PresenceRegistry();
        var otherUserId = Guid.NewGuid();
        presence.Set("conn-other", new PresenceUpdate(projectId, boardId, [itemId], "editing"), otherUserId, "Other");

        var lockedService = CreateService(context, presence);
        var (status, result) = await lockedService.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [UpdateOf(itemId, boardId, 1)], []));

        status.Should().Be(409);
        result.Conflicts.Should().ContainSingle(c => c.Id == itemId && c.Reason == "presence_locked");
    }

    [Fact]
    public async Task ApplyAsync_AllowsMutation_WhenTheOnlyPresenceIsTheCallersOwn()
    {
        var (projectId, boardId, ownerId) = await SeedBoardAsync();
        var context = _db.CreateContext();
        var itemId = Guid.NewGuid();
        var service = CreateService(context);
        await service.ApplyAsync(boardId, ownerId, new BoardMutationDto(Guid.NewGuid(), 1, [InsertOf(itemId, boardId)], []));

        var presence = new PresenceRegistry();
        presence.Set("conn-self", new PresenceUpdate(projectId, boardId, [itemId], "editing"), ownerId, "Me");
        var selfLockedService = CreateService(context, presence);

        var (status, _) = await selfLockedService.ApplyAsync(boardId, ownerId,
            new BoardMutationDto(Guid.NewGuid(), 2, [UpdateOf(itemId, boardId, 1)], []));

        status.Should().Be(200);
    }
}
