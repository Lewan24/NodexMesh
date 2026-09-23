using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public class ProjectEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private async Task<ProjectRecordDto> CreateProjectAsync(HttpClient client, string name = "Test Project")
    {
        var response = await client.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest(name, null));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
    }

    [Fact]
    public async Task ProjectTrash_IsListedForOwner_AndPermanentDeletionRequiresOwnershipAndTrash()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var path = $"/api/v1/projects/{project.Id}";
        (await owner.DeleteAsync($"{path}/permanent")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await owner.DeleteAsync(path)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var trash = await owner.GetFromJsonAsync<List<ProjectRecordDto>>("/api/v1/projects");
        trash.Should().Contain(p => p.Id == project.Id && p.DeletedAt != null);
        (await stranger.DeleteAsync($"{path}/permanent")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.DeleteAsync($"{path}/permanent")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetFromJsonAsync<List<ProjectRecordDto>>("/api/v1/projects"))!
            .Should().NotContain(p => p.Id == project.Id);
        (await owner.PostAsync($"{path}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DefaultProject_IsAccountScoped_RequiresAccess_AndCanBeCleared()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        const string path = "/api/v1/auth/default-project";
        (await owner.PutAsJsonAsync(path, new { projectId = project.Id })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var preference = await owner.GetFromJsonAsync<System.Text.Json.JsonElement>(path);
        preference.GetProperty("projectId").GetGuid().Should().Be(project.Id);
        (await stranger.PutAsJsonAsync(path, new { projectId = project.Id })).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var other = await stranger.GetFromJsonAsync<System.Text.Json.JsonElement>(path);
        other.GetProperty("projectId").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
        (await owner.PutAsJsonAsync(path, new { projectId = (Guid?)null })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var cleared = await owner.GetFromJsonAsync<System.Text.Json.JsonElement>(path);
        cleared.GetProperty("projectId").ValueKind.Should().Be(System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task CreateProject_MakesTheCallerTheOwner_AndProvisionsADefaultBoard()
    {
        var (client, userId, _, _) = await _factory.CreateSeededUserAsync();

        var project = await CreateProjectAsync(client);

        project.OwnerId.Should().Be(userId);
        project.Role.Should().Be("Owner");

        var boards = await client.GetFromJsonAsync<List<BoardRecordDto>>($"/api/v1/projects/{project.Id}/boards");
        boards.Should().ContainSingle();
    }

    [Fact]
    public async Task Participants_ListsTheOwnerAndCollaboratorsForTaskAssignment()
    {
        var (owner, ownerId, _, _) = await _factory.CreateSeededUserAsync("Project Owner");
        var (editor, editorId, editorEmail, _) = await _factory.CreateSeededUserAsync("Timeline Editor");
        var project = await CreateProjectAsync(owner);
        await owner.PostAsJsonAsync(
            $"/api/v1/projects/{project.Id}/members",
            new InviteMemberRequest(editorEmail, "Editor"));

        var participants = await editor.GetFromJsonAsync<List<ProjectParticipantDto>>(
            $"/api/v1/projects/{project.Id}/participants");

        participants.Should().BeEquivalentTo([
            new ProjectParticipantDto(ownerId, "Project Owner", "Owner"),
            new ProjectParticipantDto(editorId, "Timeline Editor", "Editor")
        ]);
    }

    [Fact]
    public async Task ListProjects_RequiresAuthentication()
    {
        var client = _factory.CreateClientNoRedirect();
        var response = await client.GetAsync("/api/v1/projects");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetProject_ByANonMember_Returns404_NotForbidden()
    {
        // IDOR / existence-oracle guard: a stranger to the project must get the same 404 as
        // a nonexistent id, never a 403 that would confirm the id is real.
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (stranger, _, _, _) = await _factory.CreateSeededUserAsync();

        var response = await stranger.GetAsync($"/api/v1/projects/{project.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetProject_ForARandomNonexistentId_AlsoReturns404_IdenticallyToNoAccess()
    {
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();
        var response = await client.GetAsync($"/api/v1/projects/{Guid.NewGuid()}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateProject_WithAStaleRevision_Returns409()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);

        var response = await owner.PatchAsJsonAsync($"/api/v1/projects/{project.Id}",
            new UpdateProjectRequest("Renamed", null, ExpectedRevision: project.Revision + 5));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateProject_ByAViewer_IsForbidden()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (viewer, viewerId, viewerEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(viewerEmail, "Viewer"));

        var response = await viewer.PatchAsJsonAsync($"/api/v1/projects/{project.Id}",
            new UpdateProjectRequest("Renamed", null, project.Revision));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TrashProject_ByANonOwnerEditor_IsForbidden()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (editor, _, editorEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(editorEmail, "Editor"));

        var response = await editor.DeleteAsync($"/api/v1/projects/{project.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TrashProject_ThenRestore_MakesItVisibleAgain()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);

        (await owner.DeleteAsync($"/api/v1/projects/{project.Id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetAsync($"/api/v1/projects/{project.Id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await owner.PostAsync($"/api/v1/projects/{project.Id}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await owner.GetAsync($"/api/v1/projects/{project.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ListMembers_MasksEmailAddressesForNonOwners()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (viewer, viewerId, viewerEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(viewerEmail, "Viewer"));
        var (_, _, secondEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(secondEmail, "Viewer"));

        // The first viewer looks at the member list: they should see their OWN email in
        // full, but the second viewer's must be masked.
        var members = await viewer.GetFromJsonAsync<List<ProjectMemberDto>>($"/api/v1/projects/{project.Id}/members");

        members!.Single(m => m.UserId == viewerId).Email.Should().Be(viewerEmail);
        var secondEntry = members.Single(m => m.UserId != viewerId);
        secondEntry.Email.Should().NotBe(secondEmail);
        secondEntry.Email.Should().Contain("***");
    }

    [Fact]
    public async Task ListMembers_ShowsFullEmailsToTheOwner()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (_, _, memberEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(memberEmail, "Viewer"));

        var members = await owner.GetFromJsonAsync<List<ProjectMemberDto>>($"/api/v1/projects/{project.Id}/members");

        members.Should().ContainSingle(m => m.Email == memberEmail);
    }

    [Fact]
    public async Task InviteMember_ForAnEmailThatIsNotRegistered_ReturnsAGeneric404()
    {
        // Distinguishing "no such user" from any other failure would let a project owner
        // probe which email addresses have accounts (OWASP A07 user enumeration).
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);

        var response = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members",
            new InviteMemberRequest($"{Guid.NewGuid():N}@nowhere.test", "Editor"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task InviteMember_WithOwnerRole_IsRejectedByValidation()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (_, _, targetEmail, _) = await _factory.CreateSeededUserAsync();

        var response = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members",
            new InviteMemberRequest(targetEmail, "Owner"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task RemoveMember_AMemberCanRemoveThemselves()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (member, memberId, memberEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(memberEmail, "Viewer"));

        var response = await member.DeleteAsync($"/api/v1/projects/{project.Id}/members/{memberId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task RemoveMember_AnotherMemberCannotRemoveSomeoneElse()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (_, targetId, targetEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(targetEmail, "Viewer"));
        var (otherMember, _, otherEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(otherEmail, "Viewer"));

        var response = await otherMember.DeleteAsync($"/api/v1/projects/{project.Id}/members/{targetId}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---------------- share links ----------------

    [Fact]
    public async Task CreateShareLink_ByAnEditor_IsForbidden_OwnerOnly()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var (editor, _, editorEmail, _) = await _factory.CreateSeededUserAsync();
        await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/members", new InviteMemberRequest(editorEmail, "Editor"));

        var response = await editor.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links",
            new CreateShareLinkRequest(null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateShareLink_ThenAccessAnonymously_ReturnsTheProjectAndBoards()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);

        var created = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links",
            new CreateShareLinkRequest("For the client", null));
        var link = await created.Content.ReadFromJsonAsync<CreatedShareLinkDto>();

        var anonymous = _factory.CreateClientNoRedirect(); // no Authorization header at all
        var response = await anonymous.GetAsync($"/api/v1/public/shared/{link!.Token}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var snapshot = await response.Content.ReadFromJsonAsync<PublicProjectSnapshotDto>();
        snapshot!.Project.Id.Should().Be(project.Id);
    }

    [Fact]
    public async Task RevokeShareLink_ThenAccessingIt_Returns404()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var project = await CreateProjectAsync(owner);
        var created = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links", new CreateShareLinkRequest(null, null));
        var link = await created.Content.ReadFromJsonAsync<CreatedShareLinkDto>();

        var revoke = await owner.DeleteAsync($"/api/v1/projects/{project.Id}/share-links/{link!.Link.Id}");
        revoke.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var anonymous = _factory.CreateClientNoRedirect();
        var afterRevoke = await anonymous.GetAsync($"/api/v1/public/shared/{link.Token}");
        afterRevoke.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
