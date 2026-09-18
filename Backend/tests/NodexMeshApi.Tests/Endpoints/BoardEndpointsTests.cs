using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
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
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();

        var response = await client.GetAsync("/api/v1/appearance");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
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
}
