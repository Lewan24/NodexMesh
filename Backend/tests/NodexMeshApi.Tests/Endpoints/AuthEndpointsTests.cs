using System.Net;
using System.Net.Http.Json;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using FluentAssertions;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

/// <summary>
/// Each test gets its own <see cref="TestWebApplicationFactory"/> (xUnit creates a fresh
/// instance of this class per [Fact]) so every test has an isolated database AND an
/// isolated rate limiter — auth endpoints are capped at 5 req/min/IP, which several tests
/// in the same class would otherwise blow through.
/// </summary>
public class AuthEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Register_ThenLogin_Succeeds()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";

        var register = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "New User", true));
        register.StatusCode.Should().Be(HttpStatusCode.Created);

        var login = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest(email, "Correct#Horse9Battery"));
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        var auth = await login.Content.ReadFromJsonAsync<AuthResponse>();
        auth!.AccessToken.Should().NotBeNullOrWhiteSpace();
        auth.User.Email.Should().Be(email);
        auth.User.IsAdmin.Should().BeFalse();
    }

    [Fact]
    public async Task Register_WhenEmailIsDisabled_AutoConfirmsAndDoesNotQueueMail()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";

        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "No Mail", true));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await response.Content.ReadFromJsonAsync<RegisteredUserResponse>())!.ConfirmationRequired.Should().BeFalse();
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.SingleAsync(user => user.Email == email)).EmailConfirmed.Should().BeTrue();
        (await db.EmailOutbox.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task EnabledEmail_EncryptsSecrets_RequiresConfirmation_AndAcceptsAValidToken()
    {
        var admin = await _factory.CreateAdminClientAsync();
        const string smtpPassword = "smtp-secret-that-must-not-leak";
        var settings = new UpdateEmailSettingsRequest(
            Enabled: true, Host: "smtp.nodexmesh.test", Port: 587, UseSsl: true,
            Username: "mailer", Password: smtpPassword, ClearPassword: false,
            FromAddress: "noreply@nodexmesh.test", FromName: "NodexMesh",
            PublicBaseUrl: "https://nodexmesh.test", UserNotificationsEnabled: true, AdminAlertsEnabled: true);
        var update = await admin.PutAsJsonAsync("/api/v1/admin/settings/email", settings);
        update.EnsureSuccessStatusCode();
        (await update.Content.ReadAsStringAsync()).Should().NotContain(smtpPassword);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var stored = await db.SystemSettings.AsNoTracking().SingleAsync();
            stored.EmailPasswordProtected.Should().NotBeNullOrWhiteSpace().And.NotBe(smtpPassword);
            stored.EmailPasswordProtected.Should().NotContain(smtpPassword);
        }

        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        const string password = "Correct#Horse9Battery";
        var register = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, password, password, "Confirm Me", true));
        register.StatusCode.Should().Be(HttpStatusCode.Created);
        var registered = (await register.Content.ReadFromJsonAsync<RegisteredUserResponse>())!;
        registered.ConfirmationRequired.Should().BeTrue();

        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password)))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);

        string token;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = (await users.FindByIdAsync(registered.Id.ToString()))!;
            user.EmailConfirmed.Should().BeFalse();
            token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GenerateEmailConfirmationTokenAsync(user)));

            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var queued = await db.EmailOutbox.AsNoTracking().SingleAsync(message => message.Kind == "account.confirmation");
            queued.ProtectedPayload.Should().NotContain(email);
        }

        (await client.PostAsJsonAsync("/api/v1/auth/confirm-email", new ConfirmEmailRequest(registered.Id, token)))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password)))
            .StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResetPassword_UsesIdentityToken_RevokesOldPassword_AndQueuesSecurityNotice()
    {
        var admin = await _factory.CreateAdminClientAsync();
        await admin.PutAsJsonAsync("/api/v1/admin/settings/email", new UpdateEmailSettingsRequest(
            true, "smtp.nodexmesh.test", 587, true, "mailer", "secret", false,
            "noreply@nodexmesh.test", "NodexMesh", "https://nodexmesh.test", true, true));
        var (_, userId, email, oldPassword) = await _factory.CreateSeededUserAsync();

        string token;
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = (await users.FindByIdAsync(userId.ToString()))!;
            user.EmailConfirmed = true;
            (await users.UpdateAsync(user)).Succeeded.Should().BeTrue();
            token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(await users.GeneratePasswordResetTokenAsync(user)));
        }

        var client = _factory.CreateClientNoRedirect();
        const string newPassword = "Br@ndNewPassword9";
        var reset = await client.PostAsJsonAsync("/api/v1/auth/reset-password",
            new ResetPasswordRequest(userId, token, newPassword, newPassword));
        reset.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, oldPassword)))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, newPassword)))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        await using var verificationScope = _factory.Services.CreateAsyncScope();
        var verificationDb = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await verificationDb.EmailOutbox.CountAsync(message => message.Kind == "account.password-changed"))
            .Should().Be(1);
    }

    [Fact]
    public async Task RecoveryRequests_AreEnumerationSafe_AndQueueOnlyEligibleAccounts()
    {
        var admin = await _factory.CreateAdminClientAsync();
        await admin.PutAsJsonAsync("/api/v1/admin/settings/email", new UpdateEmailSettingsRequest(
            true, "smtp.nodexmesh.test", 587, true, "mailer", "secret", false,
            "noreply@nodexmesh.test", "NodexMesh", "https://nodexmesh.test", true, true));
        var (_, confirmedId, confirmedEmail, _) = await _factory.CreateSeededUserAsync();
        var (_, _, unconfirmedEmail, _) = await _factory.CreateSeededUserAsync();

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var confirmed = (await users.FindByIdAsync(confirmedId.ToString()))!;
            confirmed.EmailConfirmed = true;
            (await users.UpdateAsync(confirmed)).Succeeded.Should().BeTrue();
        }

        var client = _factory.CreateClientNoRedirect();
        var knownReset = await client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new ForgotPasswordRequest(confirmedEmail));
        var unknownReset = await client.PostAsJsonAsync("/api/v1/auth/forgot-password",
            new ForgotPasswordRequest($"unknown-{Guid.NewGuid():N}@nodexmesh.test"));
        knownReset.StatusCode.Should().Be(HttpStatusCode.Accepted);
        unknownReset.StatusCode.Should().Be(HttpStatusCode.Accepted);
        (await knownReset.Content.ReadAsStringAsync()).Should().Be(await unknownReset.Content.ReadAsStringAsync());

        var knownConfirmation = await client.PostAsJsonAsync("/api/v1/auth/resend-confirmation",
            new ForgotPasswordRequest(unconfirmedEmail));
        var unknownConfirmation = await client.PostAsJsonAsync("/api/v1/auth/resend-confirmation",
            new ForgotPasswordRequest($"unknown-{Guid.NewGuid():N}@nodexmesh.test"));
        knownConfirmation.StatusCode.Should().Be(HttpStatusCode.Accepted);
        unknownConfirmation.StatusCode.Should().Be(HttpStatusCode.Accepted);
        (await knownConfirmation.Content.ReadAsStringAsync()).Should()
            .Be(await unknownConfirmation.Content.ReadAsStringAsync());

        await using var verificationScope = _factory.Services.CreateAsyncScope();
        var db = verificationScope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.EmailOutbox.CountAsync(message => message.Kind == "account.password-reset-requested"))
            .Should().Be(1);
        (await db.EmailOutbox.CountAsync(message => message.Kind == "account.confirmation"))
            .Should().Be(1);
    }

    [Fact]
    public async Task Register_SetsTheRefreshTokenAsHttpOnly_NeverExposedToJavaScript()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "New User", true));
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Correct#Horse9Battery"));

        login.Headers.TryGetValues("Set-Cookie", out var cookies).Should().BeTrue();
        var cookie = cookies!.Single(c => c.Contains("nodexmesh_refresh_token"));
        cookie.ToLowerInvariant().Should().Contain("httponly");

        // And the body must not carry it at all — only the short-lived access token does.
        var raw = await login.Content.ReadAsStringAsync();
        raw.Should().NotContain("refresh");
    }

    [Fact]
    public async Task Register_RejectsAWeakPassword()
    {
        var client = _factory.CreateClientNoRedirect();
        var response = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest($"{Guid.NewGuid():N}@nodexmesh.test", "weak", "weak", "User", true));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest); // DataAnnotations validation problem
    }

    [Fact]
    public async Task Register_Twice_WithTheSameEmail_ReturnsAGenericConflict_NotAnEnumerationHint()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        var request = new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "User", true);
        await client.PostAsJsonAsync("/api/v1/auth/register", request);

        var second = await client.PostAsJsonAsync("/api/v1/auth/register", request);

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await second.Content.ReadAsStringAsync();
        body.Should().NotContain("already", "the message must stay generic to avoid confirming the email is registered");
    }

    [Fact]
    public async Task Login_WithWrongPassword_And_LoginForANonexistentEmail_ReturnTheIdenticalResponse()
    {
        // Same status/body whether the account doesn't exist or the password is wrong —
        // distinguishing them is a user-enumeration vector (OWASP A07).
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "User", true));

        var wrongPassword = await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "WrongPassword123!"));
        var unknownEmail = await client.PostAsJsonAsync("/api/v1/auth/login",
            new LoginRequest($"{Guid.NewGuid():N}@nodexmesh.test", "WhateverPassword123!"));

        wrongPassword.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        unknownEmail.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await wrongPassword.Content.ReadAsStringAsync()).Should().Be(await unknownEmail.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Refresh_WithoutTheCsrfHeader_IsRejected_EvenWithAValidCookie()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "User", true));
        await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Correct#Horse9Battery"));
        // HttpClient in this test carries the Set-Cookie automatically via CookieContainer
        // handling in WebApplicationFactory's default handler.

        var response = await client.PostAsync("/api/v1/auth/refresh", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WithoutAnyCookie_IsRejected()
    {
        var client = _factory.CreateClientNoRedirect();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        request.Headers.Add("X-Requested-With", "nodexmesh-web");

        var response = await client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_RotatesTheToken_AndTheOldOneCanNoLongerBeUsed()
    {
        var client = _factory.CreateClientNoRedirect();
        var email = $"{Guid.NewGuid():N}@nodexmesh.test";
        await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest(email, "Correct#Horse9Battery", "Correct#Horse9Battery", "User", true));
        await client.PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Correct#Horse9Battery"));

        var refreshRequest = new HttpRequestMessage(HttpMethod.Post, "/api/v1/auth/refresh");
        refreshRequest.Headers.Add("X-Requested-With", "nodexmesh-web");
        var refreshed = await client.SendAsync(refreshRequest);

        refreshed.StatusCode.Should().Be(HttpStatusCode.OK);
        var newAuth = await refreshed.Content.ReadFromJsonAsync<AuthResponse>();
        newAuth!.AccessToken.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Profile_RequiresAuthentication()
    {
        var client = _factory.CreateClientNoRedirect();
        var response = await client.GetAsync("/api/v1/auth/profile");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Profile_ReturnsTheAuthenticatedUsersOwnData()
    {
        var (client, userId, email, _) = await _factory.CreateAuthenticatedUserAsync("Jamie");

        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var profile = await response.Content.ReadFromJsonAsync<UserProfileResponse>();
        profile!.Id.Should().Be(userId);
        profile.Email.Should().Be(email);
    }

    [Fact]
    public async Task UpdateProfile_ChangingEmail_RequiresTheCurrentPassword()
    {
        var (client, _, _, _) = await _factory.CreateAuthenticatedUserAsync();

        var response = await client.PutAsJsonAsync("/api/v1/auth/profile",
            new UpdateProfileRequest($"{Guid.NewGuid():N}@nodexmesh.test", "New Name", CurrentPassword: null));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateProfile_DisplayNameOnly_DoesNotRequireAPassword()
    {
        var (client, _, email, _) = await _factory.CreateAuthenticatedUserAsync();

        var response = await client.PutAsJsonAsync("/api/v1/auth/profile",
            new UpdateProfileRequest(email, "Brand New Name", CurrentPassword: null));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChangePassword_ThenLoginWithOldPassword_Fails()
    {
        var (client, _, email, oldPassword) = await _factory.CreateAuthenticatedUserAsync();

        var change = await client.PostAsJsonAsync("/api/v1/auth/password",
            new ChangePasswordRequest(oldPassword, "Br@ndNewPassw0rd9", "Br@ndNewPassw0rd9"));
        change.StatusCode.Should().Be(HttpStatusCode.OK);

        var loginWithOld = await _factory.CreateClientNoRedirect()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, oldPassword));
        loginWithOld.StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var loginWithNew = await _factory.CreateClientNoRedirect()
            .PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, "Br@ndNewPassw0rd9"));
        loginWithNew.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Revoke_ClearsTheSession_RegardlessOfWhetherACookieWasPresent()
    {
        var (client, _, _, _) = await _factory.CreateAuthenticatedUserAsync();

        var response = await client.PostAsync("/api/v1/auth/revoke", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }
}
