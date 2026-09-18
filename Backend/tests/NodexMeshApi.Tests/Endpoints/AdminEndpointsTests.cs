using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public class AdminEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task AdminEndpoint_WithoutAnyToken_Returns401()
    {
        var client = _factory.CreateClientNoRedirect();
        var response = await client.GetAsync("/api/v1/admin/users");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminEndpoint_AsARegularAuthenticatedUser_Returns403()
    {
        // Authenticated but lacking the admin claim: a real 403, distinct from the 401 an
        // anonymous caller gets.
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();
        var response = await client.GetAsync("/api/v1/admin/users");
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AdminEndpoint_AsTheBootstrappedAdmin_Succeeds()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var response = await admin.GetAsync("/api/v1/admin/users");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateUser_ThenThatUserCanLogIn()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";

        var created = await admin.PostAsJsonAsync("/api/v1/admin/users",
            new AdminCreateUserRequest(email, "Str0ng!AdminSet#1", "Created By Admin", false));
        created.StatusCode.Should().Be(HttpStatusCode.OK);

        var login = await _factory.CreateClientNoRedirect()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Str0ng!AdminSet#1"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_ReturnsConflict()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        var request = new AdminCreateUserRequest(email, "Str0ng!AdminSet#1", "First", false);
        await admin.PostAsJsonAsync("/api/v1/admin/users", request);

        var second = await admin.PostAsJsonAsync("/api/v1/admin/users", request);

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task BlockUser_ThenTheyCannotLogIn()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (_, targetId, targetEmail, targetPassword) = await _factory.CreateSeededUserAsync();

        var block = await admin.PatchAsJsonAsync($"/api/v1/admin/users/{targetId}/blocked", new AdminBlockUserRequest(true));
        block.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var login = await _factory.CreateClientNoRedirect()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(targetEmail, targetPassword));
        login.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BlockUser_ThenTheirExistingAccessTokenStopsWorking()
    {
        // OnTokenValidated re-checks IsBlocked on every request — a JWT already issued
        // before the block must not remain usable until it naturally expires.
        var admin = await _factory.CreateAdminClientAsync();
        var (targetClient, targetId, _, _) = await _factory.CreateSeededUserAsync();

        (await targetClient.GetAsync("/api/v1/auth/profile")).StatusCode.Should().Be(HttpStatusCode.OK);

        await admin.PatchAsJsonAsync($"/api/v1/admin/users/{targetId}/blocked", new AdminBlockUserRequest(true));

        var afterBlock = await targetClient.GetAsync("/api/v1/auth/profile");
        afterBlock.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Admin_CannotBlockThemselves()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var adminId = (await admin.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile"))!.Id;

        var response = await admin.PatchAsJsonAsync($"/api/v1/admin/users/{adminId}/blocked", new AdminBlockUserRequest(true));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Admin_CannotDemoteThemselves()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var profile = await admin.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile");

        var response = await admin.PutAsJsonAsync($"/api/v1/admin/users/{profile!.Id}",
            new AdminUpdateUserRequest(profile.Email, profile.DisplayName, IsAdmin: false));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ResetPassword_ThenOldPasswordNoLongerWorks()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (_, targetId, targetEmail, oldPassword) = await _factory.CreateSeededUserAsync();

        var reset = await admin.PostAsJsonAsync($"/api/v1/admin/users/{targetId}/password",
            new AdminResetPasswordRequest("Br@ndNewAdminSet9"));
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var loginOld = await _factory.CreateClientNoRedirect()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(targetEmail, oldPassword));
        loginOld.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task RegistrationDisabled_PreventsNewSignups()
    {
        var admin = await _factory.CreateAdminClientAsync();
        await admin.PutAsJsonAsync("/api/v1/admin/settings/registration", new AdminRegistrationRequest(false));

        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest($"{Guid.NewGuid():N}@nodexmesh.test", "Correct#Horse9Battery", "Correct#Horse9Battery", "User"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task ListProjects_AsAdmin_SeesAllProjectsAcrossUsers()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Someone else's project", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;

        var projects = await admin.GetFromJsonAsync<List<AdminProjectDto>>("/api/v1/admin/projects");

        projects.Should().Contain(p => p.Id == project.Id);
    }

    [Fact]
    public async Task AddProjectMember_ForABlockedUser_IsRejected()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("P", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var (_, blockedId, blockedEmail, _) = await _factory.CreateSeededUserAsync();
        await admin.PatchAsJsonAsync($"/api/v1/admin/users/{blockedId}/blocked", new AdminBlockUserRequest(true));

        var response = await admin.PostAsJsonAsync($"/api/v1/admin/projects/{project.Id}/members",
            new AdminAddProjectMemberRequest(blockedEmail, "Editor"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }
}
