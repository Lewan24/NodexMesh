using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
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
    public async Task InactiveProjects_AreProtected_AndUserDeletionIsRecoverableOnlyByAdmin()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var (member, memberId, memberEmail, _) = await _factory.CreateSeededUserAsync();
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Recoverable", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var userPath = $"/api/v1/projects/{project.Id}";
        var adminPath = $"/api/v1/admin/projects/{project.Id}";
        (await owner.PostAsJsonAsync($"{userPath}/members", new InviteMemberRequest(memberEmail, "Viewer"))).EnsureSuccessStatusCode();
        (await admin.DeleteAsync($"{adminPath}/permanent")).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await owner.DeleteAsync(userPath)).EnsureSuccessStatusCode();
        foreach (var userDeleted in new[] { false, true })
        {
            if (userDeleted) (await owner.DeleteAsync($"{userPath}/permanent")).EnsureSuccessStatusCode();
            var rows = await admin.GetFromJsonAsync<List<AdminProjectDto>>("/api/v1/admin/projects");
            rows!.Single(p => p.Id == project.Id).Status.Should().Be(userDeleted ? "userdeleted" : "trashed");
            (await admin.PutAsJsonAsync($"{adminPath}/owner", new AdminTransferProjectOwnerRequest(memberEmail))).StatusCode.Should().Be(HttpStatusCode.Conflict);
            (await admin.PostAsJsonAsync($"{adminPath}/members", new AdminAddProjectMemberRequest(memberEmail, "Editor"))).StatusCode.Should().Be(HttpStatusCode.Conflict);
            (await admin.DeleteAsync($"{adminPath}/members/{memberId}")).StatusCode.Should().Be(HttpStatusCode.Conflict);
            (await member.GetAsync(userPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
        (await owner.GetFromJsonAsync<List<ProjectRecordDto>>("/api/v1/projects"))!.Should().NotContain(p => p.Id == project.Id);
        (await owner.PostAsync($"{userPath}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await owner.PostAsync($"{adminPath}/restore", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await admin.PostAsync($"{adminPath}/restore", null)).EnsureSuccessStatusCode();
        (await owner.GetAsync(userPath)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await member.GetAsync(userPath)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await owner.DeleteAsync(userPath)).EnsureSuccessStatusCode();
        (await owner.DeleteAsync($"{userPath}/permanent")).EnsureSuccessStatusCode();
        (await admin.DeleteAsync($"{adminPath}/permanent")).EnsureSuccessStatusCode();
        (await admin.PostAsync($"{adminPath}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

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

        var createdUser = _factory.CreateClientNoRedirect();
        var login = await createdUser.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Str0ng!AdminSet#1"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        createdUser.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        var appearance = await createdUser.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        appearance.GetProperty("defaults").GetProperty("font").GetString().Should().Be("short-stack");
        appearance.GetProperty("uiPrimary").GetString().Should().Be("#8000ff");
        appearance.GetProperty("paletteVersion").GetInt32().Should().Be(2);
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

    [Fact]
    public async Task ResetAppearance_CanResetDefaultsAndProjectOverridesSeparately()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (target, targetId, _, _) = await _factory.CreateSeededUserAsync();
        var created = await target.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Appearance", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;

        await target.PutAsJsonAsync("/api/v1/appearance", new
        {
            font = "mono",
            mode = "dark",
            uiFont = "mono",
            uiPrimary = "#112233",
            uiSecondary = "#334455",
            inheritanceVersion = 1,
            paletteVersion = 2,
            light = JsonDocument.Parse("""{"primary":"#111111"}""").RootElement,
            dark = JsonDocument.Parse("""{"primary":"#222222"}""").RootElement
        });
        await target.PutAsJsonAsync($"/api/v1/projects/{project.Id}/appearance", new
        {
            font = "serif", mode = "light", light = (object?)null, dark = (object?)null
        });

        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{targetId}/appearance/reset",
            new AdminResetAppearanceRequest("Defaults"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var defaultsReset = await target.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        defaultsReset.GetProperty("defaults").ValueKind.Should().Be(JsonValueKind.Null);
        defaultsReset.GetProperty("projects").EnumerateObject().Should().ContainSingle();

        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{targetId}/appearance/reset",
            new AdminResetAppearanceRequest("ProjectOverrides"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        var overridesReset = await target.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        overridesReset.GetProperty("projects").EnumerateObject().Should().BeEmpty();
    }

    [Fact]
    public async Task TransferOwner_PromotesTheTargetAndKeepsThePreviousOwnerAsEditor()
    {
        var admin = await _factory.CreateAdminClientAsync();
        var (owner, ownerId, _, _) = await _factory.CreateSeededUserAsync();
        var (nextOwner, nextOwnerId, nextOwnerEmail, _) = await _factory.CreateSeededUserAsync();
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("Transfer", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        await admin.PostAsJsonAsync($"/api/v1/admin/projects/{project.Id}/members",
            new AdminAddProjectMemberRequest(nextOwnerEmail, "Viewer"));

        var response = await admin.PutAsJsonAsync($"/api/v1/admin/projects/{project.Id}/owner",
            new AdminTransferProjectOwnerRequest(nextOwnerEmail));

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var projects = await admin.GetFromJsonAsync<List<AdminProjectDto>>("/api/v1/admin/projects");
        var transferred = projects!.Single(entry => entry.Id == project.Id);
        transferred.OwnerId.Should().Be(nextOwnerId);
        transferred.Members.Should().ContainSingle(member => member.UserId == ownerId && member.Role == "Editor");
        transferred.Members.Should().NotContain(member => member.UserId == nextOwnerId);
        (await owner.GetAsync($"/api/v1/projects/{project.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await nextOwner.GetAsync($"/api/v1/projects/{project.Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
