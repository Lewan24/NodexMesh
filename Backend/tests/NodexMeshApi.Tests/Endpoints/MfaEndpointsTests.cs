using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class MfaEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    public void Dispose() => factory.Dispose();

    [Fact]
    public async Task Enrollment_Login_Recovery_Disable_AndSessionRevocation_Work()
    {
        var (client, id, address, password) = await factory.CreateSeededUserAsync();
        var oldToken = client.DefaultRequestHeaders.Authorization;
        var start = await client.PostAsJsonAsync("/api/v1/auth/mfa/start", new MfaStartRequest(password, true, "authenticator"));
        start.EnsureSuccessStatusCode();
        var challenge = (await start.Content.ReadFromJsonAsync<MfaChallengeResponse>())!;
        challenge.SetupUri.Should().StartWith("otpauth://totp/");
        var code = MfaService.Totp(challenge.SetupSecret!, DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30);
        var complete = await client.PostAsJsonAsync("/api/v1/auth/mfa/complete", new MfaCompleteRequest(challenge.ChallengeToken, code));
        complete.EnsureSuccessStatusCode();
        var result = await complete.Content.ReadFromJsonAsync<JsonElement>();
        var codes = result.GetProperty("recoveryCodes").EnumerateArray().Select(x => x.GetString()!).ToArray();
        codes.Should().HaveCount(10).And.OnlyHaveUniqueItems();
        client.DefaultRequestHeaders.Authorization = oldToken;
        (await client.GetAsync("/api/v1/auth/mfa")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result.GetProperty("auth").GetProperty("accessToken").GetString());
        var status = await client.GetFromJsonAsync<JsonElement>("/api/v1/auth/mfa");
        status.GetProperty("enabled").GetBoolean().Should().BeTrue();
        status.GetProperty("emailAvailable").GetBoolean().Should().BeFalse();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(x => x.Id == id);
            user.MfaSecretProtected.Should().NotContain(challenge.SetupSecret!);
        }
        var anonymous = factory.CreateClientNoRedirect();
        var login = await anonymous.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(address, password));
        login.EnsureSuccessStatusCode();
        login.Headers.TryGetValues("Set-Cookie", out _).Should().BeFalse();
        var loginChallenge = (await login.Content.ReadFromJsonAsync<MfaChallengeResponse>())!;
        var verified = await anonymous.PostAsJsonAsync("/api/v1/auth/mfa/verify", new MfaCompleteRequest(loginChallenge.ChallengeToken, codes[0]));
        verified.EnsureSuccessStatusCode();
        (await verified.Content.ReadFromJsonAsync<AuthResponse>())!.User.Id.Should().Be(id);
        // Four requests so far; the fifth verifies disabling with another recovery code.
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var mfa = scope.ServiceProvider.GetRequiredService<MfaService>();
            var user = await db.Users.SingleAsync(x => x.Id == id);
            var disable = await mfa.StartAsync(user, "manage", false, "authenticator");
            var response = await client.PostAsJsonAsync("/api/v1/auth/mfa/complete", new MfaCompleteRequest(disable.ChallengeToken, codes[1]));
            response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
            var disabled = await response.Content.ReadFromJsonAsync<JsonElement>();
            disabled.GetProperty("recoveryCodes").GetArrayLength().Should().Be(0);
        }
    }

    [Fact]
    public async Task Management_RequiresPassword_AndEmailMustBeAvailable()
    {
        var (client, _, _, password) = await factory.CreateSeededUserAsync();
        (await client.PostAsJsonAsync("/api/v1/auth/mfa/start", new MfaStartRequest("wrong", true, "authenticator"))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.PostAsJsonAsync("/api/v1/auth/mfa/start", new MfaStartRequest(password, true, "email"))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await client.PostAsJsonAsync("/api/v1/auth/mfa/start", new MfaStartRequest(password, true, "unsupported"))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var anonymous = factory.CreateClientNoRedirect();
        (await anonymous.GetAsync("/api/v1/auth/mfa")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await anonymous.PostAsJsonAsync("/api/v1/auth/mfa/verify", new MfaCompleteRequest("unknown", "123456"))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task EmailChange_CannotReplaceAnEnabledMfaFactor()
    {
        var (client, id, address, password) = await factory.CreateSeededUserAsync();
        await using (var scope = factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(x => x.Id == id);
            user.TwoFactorEnabled = true; await db.SaveChangesAsync();
        }
        var response = await client.PutAsJsonAsync("/api/v1/auth/profile", new UpdateProfileRequest("attacker@example.test", "Name", password));
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        await using var checkScope = factory.Services.CreateAsyncScope();
        (await checkScope.ServiceProvider.GetRequiredService<AppDbContext>().Users.SingleAsync(x => x.Id == id)).Email.Should().Be(address);
    }

    [Theory]
    [InlineData(160, HttpStatusCode.NoContent)]
    [InlineData(320, HttpStatusCode.NoContent)]
    [InlineData(400, HttpStatusCode.NoContent)]
    [InlineData(159, HttpStatusCode.BadRequest)]
    [InlineData(401, HttpStatusCode.BadRequest)]
    public async Task SidebarWidth_ValidatesAndPersistsPrivately(int width, HttpStatusCode expected)
    {
        var (client, _, _, _) = await factory.CreateSeededUserAsync();
        var initial = await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance");
        initial.GetProperty("sidebarWidth").GetInt32().Should().Be(235);
        var request = new AppearanceUpdateDto("sans", "sans", "#8000ff", "#6a00eb", 1, 2,
            JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { }), SidebarWidth: width);
        (await client.PutAsJsonAsync("/api/v1/appearance", request)).StatusCode.Should().Be(expected);
        (await client.GetFromJsonAsync<JsonElement>("/api/v1/appearance")).GetProperty("sidebarWidth").GetInt32().Should().Be(expected == HttpStatusCode.NoContent ? width : 235);
        var (other, _, _, _) = await factory.CreateSeededUserAsync();
        (await other.GetFromJsonAsync<JsonElement>("/api/v1/appearance")).GetProperty("sidebarWidth").GetInt32().Should().Be(235);
    }
}
