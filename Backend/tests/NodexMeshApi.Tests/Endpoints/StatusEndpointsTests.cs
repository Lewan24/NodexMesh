using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using NodexMeshApi.Data;
using NodexMeshApi.Common;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class StatusEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    public void Dispose() => factory.Dispose();
    private static JsonElement Json(object value) => JsonSerializer.SerializeToElement(value);
    private static ProjectStatus Done() => new(Guid.NewGuid(), "Done", "Ready to ship", new(true, "border: 2px solid #22c55e;"));
    private static async Task<ProjectRecordDto> Create(HttpClient client) =>
        (await (await client.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Statuses", null)))
            .Content.ReadFromJsonAsync<ProjectRecordDto>())!;

    [Fact]
    public async Task Definitions_AreProjectScoped_RequireEditor_AndUseConcurrency()
    {
        var (owner, _, _, _) = await factory.CreateSeededUserAsync();
        var project = await Create(owner);
        var (viewer, viewerId, _, _) = await factory.CreateSeededUserAsync();
        var (stranger, _, _, _) = await factory.CreateSeededUserAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = viewerId, Role = ProjectRole.Viewer });
            await db.SaveChangesAsync();
        }
        var path = $"/api/v1/projects/{project.Id}/statuses";
        (await stranger.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await viewer.GetAsync(path)).EnsureSuccessStatusCode();
        var body = new { expectedRevision = project.Revision.ToString(), statuses = new[] { Done() } };
        (await viewer.PutAsJsonAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await owner.PutAsJsonAsync(path, body)).EnsureSuccessStatusCode();
        (await owner.PutAsJsonAsync(path, body)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        var response = await owner.GetFromJsonAsync<JsonElement>(path);
        response.GetProperty("revision").ValueKind.Should().Be(JsonValueKind.String);
        response.GetProperty("statuses")[0].GetProperty("title").GetString().Should().Be("Done");
        var other = await Create(owner);
        var empty = await owner.GetFromJsonAsync<JsonElement>($"/api/v1/projects/{other.Id}/statuses");
        empty.GetProperty("statuses").EnumerateArray().Should().BeEmpty();
    }

    [Theory]
    [InlineData("background: url(https://example.com/track);")]
    [InlineData("@import 'https://example.com/style.css';")]
    [InlineData("color: red; </style><script>alert(1)</script>")]
    [InlineData("background: u\\72l(https://example.com/track);")]
    public async Task Definition_RejectsExternalResourcesAndMarkup(string source)
    {
        var (owner, _, _, _) = await factory.CreateSeededUserAsync();
        var project = await Create(owner);
        var status = Done() with { CustomCss = new(true, source) };
        (await owner.PutAsJsonAsync($"/api/v1/projects/{project.Id}/statuses", new
        { expectedRevision = project.Revision.ToString(), statuses = new[] { status } })).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Fact]
    public async Task Assignments_RetainOwnCssAndBorder_RejectForeignStatuses_AndAllowEditsAfterDeletion()
    {
        var (owner, _, _, _) = await factory.CreateSeededUserAsync();
        var project = await Create(owner);
        var status = Done();
        var path = $"/api/v1/projects/{project.Id}/statuses";
        (await owner.PutAsJsonAsync(path, new { expectedRevision = project.Revision.ToString(), statuses = new[] { status } })).EnsureSuccessStatusCode();
        var boards = (await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project.Id}/boards"))!;
        var board = boards.Single();
        var appearance = Json(new { statusId = status.Id, customCss = new { enabled = true, source = "font-size: 22px;" },
            border = new { color = "#903df5", width = 3, style = "solid", gradient = new { from = "#903df5", to = "#ffbd65", angle = 90 }, animation = "pulse" } });
        var item = new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 0, 0, 240, 160, 1, false, "note", 1, appearance, Json(new { content = "Test" }));
        var upsert = new ItemMutationDto(item, null, [], [], []);
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), board.Revision, [upsert], []))).EnsureSuccessStatusCode();
        var snapshot = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        snapshot.Items.Single().Appearance.GetProperty("customCss").GetProperty("source").GetString().Should().Be("font-size: 22px;");
        snapshot.Items.Single().Appearance.GetProperty("border").GetProperty("width").GetInt32().Should().Be(3);
        var unassigned = Done() with { Title = "Private workflow status" };
        var definitionState = await owner.GetFromJsonAsync<JsonElement>(path);
        (await owner.PutAsJsonAsync(path, new { expectedRevision = definitionState.GetProperty("revision").GetString(), statuses = new[] { status, unassigned } })).EnsureSuccessStatusCode();
        var shared = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links", new CreateShareLinkRequest(null, null));
        var token = (await shared.Content.ReadFromJsonAsync<CreatedShareLinkDto>())!.Token;
        using var anonymous = factory.CreateClientNoRedirect();
        var publicBoard = (await anonymous.GetFromJsonAsync<PublicBoardSnapshotDto>($"/api/v1/public/shared/{token}/boards/{board.Id}"))!;
        publicBoard.Statuses!.Should().ContainSingle().Which.Id.Should().Be(status.Id);
        publicBoard.Statuses!.Single().CustomCss!.Source.Should().Be("border: 2px solid #22c55e;");
        var other = await Create(owner);
        var otherBoard = (await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{other.Id}/boards"))!.Single();
        var foreign = upsert with { Item = item with { Id = Guid.NewGuid(), BoardId = otherBoard.Id } };
        (await owner.PostAsJsonAsync($"/api/v1/boards/{otherBoard.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), otherBoard.Revision, [foreign], []))).StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        var definitions = await owner.GetFromJsonAsync<JsonElement>(path);
        (await owner.PutAsJsonAsync(path, new { expectedRevision = definitions.GetProperty("revision").GetString(), statuses = Array.Empty<ProjectStatus>() })).EnsureSuccessStatusCode();
        var update = upsert with { ExpectedRevision = snapshot.Items.Single().Revision, Item = item with { Data = Json(new { content = "Still editable" }) } };
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), snapshot.Board.Revision, [update], []))).EnsureSuccessStatusCode();
        var latest = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!;
        var clear = update with { ExpectedRevision = latest.Items.Single().Revision,
            Item = item with { Appearance = Json(new { statusId = (Guid?)null, border = (object?)null, customCss = new { enabled = true, source = "font-size: 22px;" } }) } };
        (await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", new BoardMutationDto(Guid.NewGuid(), latest.Board.Revision, [clear], []))).EnsureSuccessStatusCode();
        var cleared = (await owner.GetFromJsonAsync<BoardSnapshotDto>($"/api/v1/boards/{board.Id}"))!.Items.Single().Appearance;
        cleared.TryGetProperty("statusId", out _).Should().BeFalse();
        cleared.TryGetProperty("border", out _).Should().BeFalse();
        cleared.GetProperty("customCss").GetProperty("source").GetString().Should().Be("font-size: 22px;");
    }
}
