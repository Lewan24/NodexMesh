using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using static NodexMeshApi.Endpoints.CommentEndpoints;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public class BoardEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static JsonElement EmptyObject() => JsonDocument.Parse("{}").RootElement;
    private static JsonElement NoteData(string content = "hello") => JsonSerializer.SerializeToElement(new { content });

    private async Task<(ProjectRecordDto Project, BoardRecordDto Board)> CreateProjectWithBoardAsync(HttpClient owner)
    {
        var projectResponse = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Board Test", null));
        var project = (await projectResponse.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var boards = await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project.Id}/boards");
        return (project, boards!.Single());
    }

    private static ItemMutationDto NoteInsert(Guid boardId, Guid? itemId = null) => new(
        new ItemWriteDto(itemId ?? Guid.NewGuid(), boardId, null, null, 0, 0, 0, 100, 100, 0, false,
            "note", 1, EmptyObject(), NoteData()),
        ExpectedRevision: null, Links: [], Comments: [], Tags: []);

    [Theory]
    [InlineData("checklist")]
    [InlineData("kanban")]
    public async Task TaskReadsFilterCompletedAndPartialEditsPreserveThem(string type)
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var entries = new[] { new { id = "open", text = "Open task", done = false }, new { id = "done", text = "Secret completed text", done = true } };
        var data = type == "checklist"
            ? JsonSerializer.SerializeToElement(new { title = "Tasks", entries, hideCompleted = true })
            : JsonSerializer.SerializeToElement(new { title = "Tasks", hideCompleted = true, columns = new[] { new { id = "column", title = "Column", color = "#ffffff", cards = entries } } });
        var insert = NoteInsert(board.Id);
        insert = insert with { Item = insert.Item with { Type = type, Data = data } };
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), board.Revision, [insert], []))).EnsureSuccessStatusCode();
        var path = $"/api/v1/boards/{board.Id}";
        var partial = (await owner.GetFromJsonAsync<BoardSnapshotDto>(path + "?includeCompleted=false"))!;
        partial.Items.Single().TaskSummary!.CompletedCount.Should().Be(1);
        partial.Items.Single().Data.GetRawText().Should().NotContain("Secret completed text");
        var full = (await owner.GetFromJsonAsync<BoardSnapshotDto>(path + "?includeCompleted=true"))!;
        full.Items.Single().Data.GetRawText().Should().Contain("Secret completed text");
        // Older clients receive complete data unless they explicitly opt into partial reads.
        (await owner.GetFromJsonAsync<BoardSnapshotDto>(path))!.Items.Single().Data.GetRawText().Should().Contain("Secret completed text");
        var selected = (await owner.GetFromJsonAsync<BoardSnapshotDto>(path + $"?includeCompleted=false&includeCompletedFor={insert.Item.Id}"))!;
        selected.Items.Single().TaskSummary.Should().BeNull();
        selected.Items.Single().Data.GetRawText().Should().Contain("Secret completed text");
        var pageResponse = await owner.PostAsJsonAsync(path + "/item-page", new BoardPageRequest([insert.Item.Id], partial.Board.Revision, IncludeCompleted: false));
        pageResponse.EnsureSuccessStatusCode();
        (await pageResponse.Content.ReadFromJsonAsync<BoardSnapshotDto>())!.Items.Single().Data.GetRawText().Should().NotContain("Secret completed text");
        var taskPath = $"{path}/items/{insert.Item.Id}/completed-tasks?expectedRevision={partial.Items.Single().Revision}";
        var completed = await owner.GetFromJsonAsync<JsonElement>(taskPath);
        completed.GetRawText().Should().Contain("Secret completed text").And.NotContain("Open task");
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();
        (await stranger.GetAsync(taskPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.GetAsync($"{path}/items/{insert.Item.Id}/completed-tasks?expectedRevision=0")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var edit = insert with { ExpectedRevision = partial.Items.Single().Revision,
            Item = insert.Item with { Data = partial.Items.Single().Data, PreserveCompletedTasks = true, X = 50 } };
        (await owner.PostAsJsonAsync(path + "/mutations", new BoardMutationDto(Guid.NewGuid(), partial.Board.Revision, [edit], []))).EnsureSuccessStatusCode();
        var after = (await owner.GetFromJsonAsync<BoardSnapshotDto>(path + "?includeCompleted=true"))!;
        after.Items.Single().Data.GetRawText().Should().Contain("Secret completed text");
        after.Items.Single().X.Should().Be(50);
        (await owner.GetAsync(taskPath)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        // Full-data edits can explicitly delete completed tasks.
        var deletion = edit with { ExpectedRevision = after.Items.Single().Revision, Item = edit.Item with { PreserveCompletedTasks = false } };
        (await owner.PostAsJsonAsync(path + "/mutations", new BoardMutationDto(Guid.NewGuid(), after.Board.Revision, [deletion], []))).EnsureSuccessStatusCode();
        (await owner.GetFromJsonAsync<BoardSnapshotDto>(path + "?includeCompleted=true"))!.Items.Single().Data.GetRawText().Should().NotContain("Secret completed text");
    }

    [Fact]
    public async Task RichTasks_RoundTripDetailsAndRejectForeignAssignees()
    {
        var (owner, ownerId, _, _) = await _factory.CreateSeededUserAsync();
        var (_, strangerId, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var richData = JsonSerializer.SerializeToElement(new { title = "Tasks", entries = new[] { new {
            id = "task", text = "Release", done = false, description = "Task details", deadline = "2026-10-31",
            categoryIds = new[] { "important", "medium" }, assigneeUserId = ownerId,
            subtasks = new[] { new { id = "sub", text = "Test", done = true } } } } });
        var item = NoteInsert(board.Id);
        item = item with { Item = item.Item with { Type = "checklist", Data = richData } };
        var path = $"/api/v1/boards/{board.Id}";
        (await owner.PostAsJsonAsync(path + "/mutations", new BoardMutationDto(Guid.NewGuid(), board.Revision, [item], []))).EnsureSuccessStatusCode();
        var stored = (await owner.GetFromJsonAsync<BoardSnapshotDto>(path))!;
        stored.Items.Single().Data.GetProperty("entries")[0].GetProperty("description").GetString().Should().Be("Task details");
        stored.Items.Single().Data.GetProperty("entries")[0].GetProperty("categoryIds").EnumerateArray()
            .Select(category => category.GetString()).Should().Equal("important", "medium");
        stored.Items.Single().Data.GetProperty("entries")[0].GetProperty("subtasks")[0].GetProperty("done").GetBoolean().Should().BeTrue();
        var foreignData = JsonDocument.Parse(richData.GetRawText().Replace(ownerId.ToString(), strangerId.ToString())).RootElement;
        var edit = item with { ExpectedRevision = stored.Items.Single().Revision, Item = item.Item with { Data = foreignData } };
        (await owner.PostAsJsonAsync(path + "/mutations", new BoardMutationDto(Guid.NewGuid(), stored.Board.Revision, [edit], [])))
            .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Commenter_CanManageOwnComments_ButViewerAndOtherAuthorsCannotWrite()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, board) = await CreateProjectWithBoardAsync(owner);
        var (commenter, commenterId, commenterEmail, _) = await _factory.CreateSeededUserAsync();
        var (viewer, _, viewerEmail, _) = await _factory.CreateSeededUserAsync();
        var (other, _, otherEmail, _) = await _factory.CreateSeededUserAsync();
        foreach (var (email, role) in new[] { (commenterEmail, "Commenter"), (viewerEmail, "Viewer"), (otherEmail, "Commenter") })
            (await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(email, role))).EnsureSuccessStatusCode();
        var item = NoteInsert(board.Id);
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), board.Revision, [item], []))).EnsureSuccessStatusCode();
        var before = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        var path = $"/api/v1/boards/{board.Id}/items/{item.Item.Id}/comments";
        var commentId = Guid.NewGuid();
        var request = new UpdateCommentsRequest(before.Board.Revision, [new CommentWrite(commentId, "Review this", "open")], []);
        // Invalid projection options must fail before committing a comment or advancing its revision.
        (await commenter.PutAsJsonAsync(path + "?includeCompleted=false&includeCompletedFor=invalid", request))
            .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await viewer.PutAsJsonAsync(path, request)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var added = await commenter.PutAsJsonAsync(path, request);
        added.EnsureSuccessStatusCode();
        var after = (await added.Content.ReadFromJsonAsync<BoardSnapshotDto>())!;
        after.Comments.Should().ContainSingle(c => c.Id == commentId && c.CreatedBy == commenterId);
        after.Items.Single().Data.GetRawText().Should().Be(before.Items.Single().Data.GetRawText());
        (await commenter.PutAsJsonAsync(path, request)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var edit = new UpdateCommentsRequest(after.Board.Revision, [new CommentWrite(commentId, "Reviewed", "resolved")], []);
        (await other.PutAsJsonAsync(path, edit)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var edited = await commenter.PutAsJsonAsync(path, edit);
        edited.EnsureSuccessStatusCode();
        var updated = (await edited.Content.ReadFromJsonAsync<BoardSnapshotDto>())!;
        updated.Comments.Single().Status.Should().Be("resolved");
        var deletion = new UpdateCommentsRequest(updated.Board.Revision, [], [commentId]);
        (await other.PutAsJsonAsync(path, deletion)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var deleted = await commenter.PutAsJsonAsync(path, deletion);
        deleted.EnsureSuccessStatusCode();
        (await deleted.Content.ReadFromJsonAsync<BoardSnapshotDto>())!.Comments.Should().BeEmpty();
        (await owner.DeleteAsync($"/api/v1/projects/{project.Id}")).EnsureSuccessStatusCode();
        (await commenter.PutAsJsonAsync(path, edit)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSnapshot_ForABoardTheCallerCannotSee_Returns404()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();

        var response = await stranger.GetAsync($"/api/v1/boards/{board.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ApplyMutation_InsertsAnItem_VisibleInTheNextSnapshot()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var itemId = Guid.NewGuid();
        var mutation = new BoardMutationDto(Guid.NewGuid(), board.Revision, [NoteInsert(board.Id, itemId)], []);

        var response = await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", mutation);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}");
        snapshot!.Items.Should().ContainSingle(i => i.Id == itemId);
    }

    [Fact]
    public async Task ApplyMutation_WithAStaleBoardRevision_Returns409WithCurrentRevision()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var mutation = new BoardMutationDto(Guid.NewGuid(), board.Revision + 100, [NoteInsert(board.Id)], []);

        var response = await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", mutation);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var result = await response.Content.ReadFromJsonAsync<BoardMutationResultDto>();
        result!.Conflicts.Should().ContainSingle(c => c.Reason == "revision_mismatch");
    }

    [Fact]
    public async Task ApplyMutation_ByAViewer_IsForbidden()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, board) = await CreateProjectWithBoardAsync(owner);
        var (viewer, _, viewerEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(viewerEmail, "Viewer"));

        var response = await viewer.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [NoteInsert(board.Id)], []));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ApplyMutation_ByACommenter_IsForbidden_ReadOnlyForCanvasData()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, board) = await CreateProjectWithBoardAsync(owner);
        var (commenter, _, commenterEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(commenterEmail, "Commenter"));

        var response = await commenter.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [NoteInsert(board.Id)], []));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ApplyMutation_ByAnEditor_Succeeds()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, board) = await CreateProjectWithBoardAsync(owner);
        var (editor, _, editorEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(editorEmail, "Editor"));

        var response = await editor.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [NoteInsert(board.Id)], []));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ApplyMutation_RejectsMassAssignmentViaAnUnknownItemDataField()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var tampered = new ItemMutationDto(
            new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 0, 0, 100, 100, 0, false,
                "note", 1, EmptyObject(), JsonSerializer.SerializeToElement(new { content = "hi", isAdmin = true })),
            null, [], [], []);

        var response = await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [tampered], []));

        response.StatusCode.Should().Be((HttpStatusCode)422);
    }

    [Fact]
    public async Task ApplyMutation_RejectsAJavascriptUrlInAnImageItem()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var xssAttempt = new ItemMutationDto(
            new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 0, 0, 100, 100, 0, false,
                "image", 1, EmptyObject(), JsonSerializer.SerializeToElement(new { url = "javascript:alert(document.cookie)", caption = "" })),
            null, [], [], []);

        var response = await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [xssAttempt], []));

        response.StatusCode.Should().Be((HttpStatusCode)422);
    }

    [Fact]
    public async Task RenameBoard_ThenGetBoards_ReflectsTheNewName()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, board) = await CreateProjectWithBoardAsync(owner);

        var rename = await owner.PatchAsJsonAsync($"/api/v1/boards/{board.Id}", new RenameBoardRequest("Renamed Board"));
        rename.StatusCode.Should().Be(HttpStatusCode.OK);

        var boards = await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project.Id}/boards");
        boards!.Single().Name.Should().Be("Renamed Board");
    }

    [Fact]
    public async Task DeleteBoard_CannotDeleteTheOnlyMainBoard()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);

        var response = await owner.DeleteAsync($"/api/v1/boards/{board.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task DeleteBoard_CanDeleteASecondaryBoard()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, _) = await CreateProjectWithBoardAsync(owner);
        var created = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/boards", new CreateBoardRequest("Second Board"));
        var secondBoard = (await created.Content.ReadFromJsonAsync<BoardRecordDto>())!;

        var response = await owner.DeleteAsync($"/api/v1/boards/{secondBoard.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    // ---------------- appearance ----------------

    [Fact]
    public async Task GetAppearance_ReturnsTheDefaultProfileCreatedAtRegistration()
    {
        var (client, _, _, _) = await _factory.CreateAuthenticatedUserAsync();

        var response = await client.GetAsync("/api/v1/appearance");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var appearance = await response.Content.ReadFromJsonAsync<JsonElement>();
        var defaults = appearance.GetProperty("defaults");
        defaults.GetProperty("font").GetString().Should().Be("short-stack");
        appearance.GetProperty("uiFont").GetString().Should().Be("sans");
        appearance.GetProperty("uiPrimary").GetString().Should().Be("#8000ff");
        appearance.GetProperty("uiSecondary").GetString().Should().Be("#6a00eb");
        appearance.GetProperty("inheritanceVersion").GetInt32().Should().Be(1);
        appearance.GetProperty("paletteVersion").GetInt32().Should().Be(2);

        var light = defaults.GetProperty("light");
        light.GetProperty("primary").GetString().Should().Be("#903df5");
        light.GetProperty("secondary").GetString().Should().Be("#ff0000");
        light.GetProperty("canvas").GetString().Should().Be("#f5f5f7");
        light.GetProperty("accent1").GetString().Should().Be("#6e5fa8");
        light.GetProperty("accent5").GetString().Should().Be("#946a6a");
        light.GetProperty("gradients").EnumerateObject().Should().BeEmpty();

        var dark = defaults.GetProperty("dark");
        dark.GetProperty("primary").GetString().Should().Be("#903df5");
        dark.GetProperty("canvas").GetString().Should().Be("#0b0b0c");
        dark.GetProperty("default").GetString().Should().Be("#18181b");
        dark.GetProperty("accent1").GetString().Should().Be("#8272ba");
        dark.GetProperty("accent5").GetString().Should().Be("#aa7d7d");
        dark.GetProperty("gradients").EnumerateObject().Should().BeEmpty();
    }

    [Fact]
    public async Task PutAppearance_ThenGet_PersistsTheChange()
    {
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();
        var update = new AppearanceUpdateDto(
            "sans", "sans", "#111111", "#222222", 1, 1,
            JsonDocument.Parse("""{"primary":"#000000"}""").RootElement,
            JsonDocument.Parse("""{"primary":"#ffffff"}""").RootElement,
            "dark");

        var put = await client.PutAsJsonAsync("/api/v1/appearance", update);
        put.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var get = await client.GetAsync("/api/v1/appearance");
        var body = await get.Content.ReadAsStringAsync();
        body.Should().Contain("#111111");
    }

    [Fact]
    public async Task PutProjectAppearance_RequiresAtLeastViewerAccess()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = (await (await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("P", null)))
            .Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();

        var response = await stranger.PutAsJsonAsync($"/api/v1/projects/{project.Id}/appearance",
            new ProjectAppearanceUpdateDto("sans", null, null, null));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound); // no access at all -> 404, not 403
    }
    [Fact]
    public async Task LoadingPages_EnforceAccessScopeBatchSizeAndRevision()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (outsider, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var insert = NoteInsert(board.Id);
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [insert], []))).EnsureSuccessStatusCode();
        var manifestPath = $"/api/v1/boards/{board.Id}/loading-manifest";
        var pagePath = $"/api/v1/boards/{board.Id}/item-page";
        var manifest = (await owner.GetFromJsonAsync<BoardLoadingManifestDto>(manifestPath))!;
        manifest.Items.Should().ContainSingle().Which.Id.Should().Be(insert.Item.Id);
        var page = await owner.PostAsJsonAsync(pagePath, new BoardPageRequest([insert.Item.Id], manifest.Board.Revision));
        page.EnsureSuccessStatusCode();
        (await page.Content.ReadFromJsonAsync<BoardSnapshotDto>())!.Items.Should().ContainSingle();
        (await outsider.GetAsync(manifestPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await outsider.PostAsJsonAsync(pagePath, new BoardPageRequest([insert.Item.Id], manifest.Board.Revision)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.PostAsJsonAsync(pagePath, new BoardPageRequest([Guid.NewGuid()], manifest.Board.Revision)))
            .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await owner.PostAsJsonAsync(pagePath, new BoardPageRequest([insert.Item.Id], board.Revision)))
            .StatusCode.Should().Be(HttpStatusCode.Conflict);
        var oversized = Enumerable.Range(0, 51).Select(_ => Guid.NewGuid()).ToArray();
        var rejected = await owner.PostAsJsonAsync(pagePath, new BoardPageRequest(oversized, manifest.Board.Revision));
        rejected.IsSuccessStatusCode.Should().BeFalse();
    }

    [Fact]
    public async Task Dispenser_PersistsPaperColorSeparatelyAndRejectsInvalidColors()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board) = await CreateProjectWithBoardAsync(owner);
        var dispenser = NoteInsert(board.Id);
        dispenser = dispenser with
        {
            Item = dispenser.Item with
            {
                Type = "dispenser",
                Appearance = JsonSerializer.SerializeToElement(new { color = "#112233" }),
                Data = JsonSerializer.SerializeToElement(new { title = "Paper", paperColor = "#abcdef" })
            }
        };
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [dispenser], []))).EnsureSuccessStatusCode();
        var snapshot = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        var saved = snapshot.Items.Single();
        saved.Appearance.GetProperty("color").GetString().Should().Be("#112233");
        saved.Data.GetProperty("paperColor").GetString().Should().Be("#abcdef");
        foreach (var color in new string?[] { "red", null, "#bad" })
        {
            var invalid = dispenser with
            {
                Item = dispenser.Item with
                {
                    Id = Guid.NewGuid(),
                    Data = JsonSerializer.SerializeToElement(new { title = "Paper", paperColor = color })
                }
            };
            (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
                new BoardMutationDto(Guid.NewGuid(), snapshot.Board.Revision, [invalid], [])))
                .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        }
    }

}
