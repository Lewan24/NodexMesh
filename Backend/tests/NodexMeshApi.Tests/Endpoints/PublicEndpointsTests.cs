using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public class PublicEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task<(ProjectRecordDto Project, BoardRecordDto Board, string Token)> SeedSharedProjectAsync(HttpClient owner)
    {
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Shared", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var boards = await owner.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project.Id}/boards");
        var link = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links", new CreateShareLinkRequest(null, null));
        var created2 = await link.Content.ReadFromJsonAsync<CreatedShareLinkDto>();
        return (project, boards!.Single(), created2!.Token);
    }

    [Fact]
    public async Task GetSharedProject_WithAnUnknownToken_Returns404()
    {
        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.GetAsync("/api/v1/public/shared/not-a-real-token-value-at-all-1234567890");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSharedProject_RequiresNoAuthentication()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, _, token) = await SeedSharedProjectAsync(owner);
        var anonymous = _factory.CreateClientNoRedirect(); // no bearer token at all

        var response = await anonymous.GetAsync($"/api/v1/public/shared/{token}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await response.Content.ReadFromJsonAsync<PublicProjectSnapshotDto>();
        snapshot!.Project.Id.Should().Be(project.Id);
    }

    [Fact]
    public async Task GetSharedBoard_ReturnsItemsWithoutAnyUserIdentifiers()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board, token) = await SeedSharedProjectAsync(owner);
        // Put an item on the board so the snapshot has something to scrub.
        var mutation = new BoardMutationDto(Guid.NewGuid(), board.Revision,
            [new ItemMutationDto(
                new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 0, 0, 100, 100, 0, false,
                    "note", 1, JsonDocument.Parse("{}").RootElement, JsonSerializer.SerializeToElement(new { content = "hi" })),
                null, [], [], [])], []);
        await owner.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations", mutation);

        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.GetAsync($"/api/v1/public/shared/{token}/boards/{board.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var raw = await response.Content.ReadAsStringAsync();
        // PublicItemDto has no createdBy/updatedBy/authorId fields at all — this guards
        // against a future field being added to the record and silently leaking through.
        raw.Should().NotContain("createdBy", "public snapshot DTOs must never carry internal user ids");
        raw.Should().NotContain("updatedBy");
        raw.Should().NotContain("authorId");
    }

    [Fact]
    public async Task GetSharedBoard_ForABoardBelongingToADifferentProject_Returns404()
    {
        // IDOR: a valid token for project A must not be usable to read a board from
        // project B just by guessing/observing its id.
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, _, tokenForA) = await SeedSharedProjectAsync(owner);
        var (otherOwner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, boardB, _) = await SeedSharedProjectAsync(otherOwner);

        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.GetAsync($"/api/v1/public/shared/{tokenForA}/boards/{boardB.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSharedProject_AfterTheProjectIsTrashed_Returns404()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (project, _, token) = await SeedSharedProjectAsync(owner);
        await owner.DeleteAsync($"/api/v1/projects/{project.Id}");

        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.GetAsync($"/api/v1/public/shared/{token}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSharedProject_NoWriteEndpointExists_MutationRouteRequiresAuth()
    {
        // The public group is deliberately read-only. There is no anonymous mutation route,
        // so the same board path under the authenticated prefix must still demand a token.
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (_, board, _) = await SeedSharedProjectAsync(owner);
        var anonymous = _factory.CreateClientNoRedirect();

        var response = await anonymous.PostAsJsonAsync($"/api/v1/boards/{board.Id}/mutations",
            new BoardMutationDto(Guid.NewGuid(), board.Revision, [], []));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
