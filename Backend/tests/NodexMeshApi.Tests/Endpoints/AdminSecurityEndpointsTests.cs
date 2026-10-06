using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NodexMeshApi.Auditing;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Endpoints;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class AdminSecurityEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory factory = new();
    public void Dispose() => factory.Dispose();
    private sealed class RequestBodyFeature : Microsoft.AspNetCore.Http.Features.IHttpRequestBodyDetectionFeature
    {
        public bool CanHaveBody => true;
    }

    [Theory]
    [InlineData("192.0.2.123", "192.0.2.123")]
    [InlineData("2001:0db8:0:0:0:0:0:123", "2001:db8::123")]
    [InlineData("::ffff:192.0.2.123", "192.0.2.123")]
    public async Task ManualBanIsPersistedAuditedEnforcedAndCanBeReleased(string input, string expected)
    {
        var admin = await factory.CreateAdminClientAsync();
        var response = await admin.PostAsJsonAsync("/api/v1/admin/security/ips",
            new BanIpRequest(input, "Verified malicious activity", 120));
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var state = await db.IpAccessStates.SingleAsync();
            state.Ip.Should().Be(expected);
            state.Reason.Should().Be("manual_admin");
            state.BannedUntil.Should().BeAfter(DateTime.UtcNow.AddMinutes(119));
            var audit = await db.AuditEvents.SingleAsync(x => x.EventType == "admin.ip_banned");
            audit.ActorId.Should().NotBeNull();
            audit.ResourceId.Should().Be(expected);
            audit.Metadata.Should().Contain("Verified malicious activity");
        }
        var blocked = await factory.Server.SendAsync(http =>
        {
            http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse(expected);
            http.Request.Path = "/api/v1/security/ip-check";
        });
        blocked.Response.StatusCode.Should().Be(403);
        (await admin.PostAsJsonAsync("/api/v1/admin/security/ips",
            new BanIpRequest(input, "Duplicate manual ban"))).StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await admin.PostAsJsonAsync($"/api/v1/admin/security/ips/{Uri.EscapeDataString(expected)}/release",
            new ReleaseIpRequest("Investigation completed"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Theory]
    [InlineData("not-an-ip")]
    [InlineData("192.0.2.1/24")]
    [InlineData("127.1")]
    [InlineData("192.0.2.1:8080")]
    [InlineData("fe80::1%eth0")]
    public async Task ManualBanRejectsInvalidAddresses(string ip)
    {
        var admin = await factory.CreateAdminClientAsync();
        (await admin.PostAsJsonAsync("/api/v1/admin/security/ips", new BanIpRequest(ip, "Invalid address test")))
            .StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(43201)]
    public async Task ManualBanRejectsInvalidDurations(int minutes)
    {
        var admin = await factory.CreateAdminClientAsync();
        var response = await admin.PostAsJsonAsync("/api/v1/admin/security/ips", new BanIpRequest("192.0.2.1", "Duration validation test", minutes));
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task ManualBanRequiresAdminAndEnabledProtectionAndRejectsAllowlistedAddresses()
    {
        var (user, _, _, _) = await factory.CreateSeededUserAsync();
        var request = new BanIpRequest("192.0.2.1", "Authorization validation test");
        (await user.PostAsJsonAsync("/api/v1/admin/security/ips", request)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await factory.CreateClientNoRedirect().PostAsJsonAsync("/api/v1/admin/security/ips", request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var admin = await factory.CreateAdminClientAsync();
        var options = factory.Services.GetRequiredService<Microsoft.Extensions.Options.IOptions<IpProtectionOptions>>().Value;
        options.Allowlist = ["192.0.2.1"];
        (await admin.PostAsJsonAsync("/api/v1/admin/security/ips", request)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        options.Enabled = false;
        (await admin.PostAsJsonAsync("/api/v1/admin/security/ips", request with { Ip = "192.0.2.2" })).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task ManualBanCannotBanAdministratorCurrentAddress()
    {
        var admin = await factory.CreateAdminClientAsync();
        var body = JsonSerializer.Serialize(new BanIpRequest("::ffff:192.0.2.1", "Prevent accidental lockout"));
        var response = await factory.Server.SendAsync(http =>
        {
            http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.1");
            http.Request.Path = "/api/v1/admin/security/ips";
            http.Request.Method = "POST";
            http.Features.Set<Microsoft.AspNetCore.Http.Features.IHttpRequestBodyDetectionFeature>(new RequestBodyFeature());
            http.Request.ContentType = "application/json";
            http.Request.ContentLength = System.Text.Encoding.UTF8.GetByteCount(body);
            http.Request.Body = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(body));
            http.Request.Headers.Authorization = admin.DefaultRequestHeaders.Authorization!.ToString();
        });
        response.Response.StatusCode.Should().Be(409, await new StreamReader(response.Response.Body).ReadToEndAsync());
        using var scope = factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<AppDbContext>().IpAccessStates.AnyAsync(x => x.BannedUntil != null)).Should().BeFalse();
    }

    [Fact]
    public async Task ScannerTrafficTriggersBanInRealPipelineAndForgedHeadersCannotChooseVictimIp()
    {
        _ = factory.Services;
        for (var i = 0; i < 40; i++)
        {
            var response = await factory.Server.SendAsync(http =>
            {
                http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.77");
                http.Request.Path = "/scanner-probe-" + i;
                http.Request.Headers["X-Forwarded-For"] = "192.0.2.88";
            });
            response.Response.StatusCode.Should().Be(404);
        }
        var blocked = await factory.Server.SendAsync(http =>
        {
            http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.77");
            http.Request.Path = "/api/v1/security/ip-check";
        });
        blocked.Response.StatusCode.Should().Be(403);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.IpAccessStates.SingleAsync()).Ip.Should().Be("192.0.2.77");
        (await db.AuditEvents.CountAsync(x => x.EventType == "http.unmatched")).Should().Be(40);
    }

    [Fact]
    public async Task ResetMfaRevokesAllCredentialsAndSessionsAndAuditsReason()
    {
        var admin = await factory.CreateAdminClientAsync();
        var (client, id, email, password) = await factory.CreateSeededUserAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(x => x.Id == id);
            user.TwoFactorEnabled = true;
            user.MfaPreferredMethod = "authenticator";
            user.MfaSecretProtected = scope.ServiceProvider.GetRequiredService<MfaService>().Protect("JBSWY3DPEHPK3PXP");
            db.MfaRecoveryCodes.Add(new MfaRecoveryCode { Id = Guid.NewGuid(), UserId = id, CodeHash = "old" });
            await db.SaveChangesAsync();
            await scope.ServiceProvider.GetRequiredService<MfaService>().StartAsync(user, "login");
        }
        var response = await admin.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset",
            new AdminMfaResetRequest(TestWebApplicationFactory.AdminPassword, "Verified user identity by support"));
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync("/api/v1/auth/profile")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(x => x.Id == id);
            user.TwoFactorEnabled.Should().BeFalse();
            user.MfaSecretProtected.Should().BeNull();
            user.MfaLastAcceptedStep.Should().BeNull();
            (await db.MfaChallenges.AnyAsync(x => x.UserId == id)).Should().BeFalse();
            (await db.MfaRecoveryCodes.AnyAsync(x => x.UserId == id)).Should().BeFalse();
            (await db.RefreshTokens.AnyAsync(x => x.UserId == id && x.RevokedAtUtc == null)).Should().BeFalse();
            (await db.AuditEvents.SingleAsync(x => x.EventType == "admin.mfa_reset")).TargetUserId.Should().Be(id);
        }
        (await factory.CreateClientNoRedirect().PostAsJsonAsync("/api/v1/auth/login", new LoginRequest(email, password))).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ResetRequiresRolePasswordAndPreventsSelfReset()
    {
        var (user, id, _, _) = await factory.CreateSeededUserAsync();
        var request = new AdminMfaResetRequest(TestWebApplicationFactory.AdminPassword, "Support identity verified");
        (await user.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset", request)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var admin = await factory.CreateAdminClientAsync();
        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset", request with { CurrentPassword = "wrong" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var profile = await admin.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile");
        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{profile!.Id}/mfa/reset", request)).StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task AdminEnrolledFactorIsRequiredAndChallengeIsTargetBoundAndSingleUse()
    {
        var admin = await factory.CreateAdminClientAsync();
        var (_, id, _, _) = await factory.CreateSeededUserAsync();
        var (_, otherId, _, _) = await factory.CreateSeededUserAsync();
        var profile = await admin.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/profile");
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.SingleAsync(x => x.Id == profile!.Id);
            user.TwoFactorEnabled = true;
            user.MfaPreferredMethod = "authenticator";
            user.MfaSecretProtected = scope.ServiceProvider.GetRequiredService<MfaService>().Protect("JBSWY3DPEHPK3PXP");
            await db.SaveChangesAsync();
        }
        var challenge = await (await admin.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset/start", new AdminMfaResetStart(TestWebApplicationFactory.AdminPassword))).Content.ReadFromJsonAsync<MfaChallengeResponse>();
        var request = new AdminMfaResetRequest(TestWebApplicationFactory.AdminPassword, "Support identity verified", challenge!.ChallengeToken,
            MfaService.Totp("JBSWY3DPEHPK3PXP", DateTimeOffset.UtcNow.ToUnixTimeSeconds() / 30));
        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{otherId}/mfa/reset", request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset", request)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await admin.PostAsJsonAsync($"/api/v1/admin/users/{id}/mfa/reset", request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminCanListAndReleaseBanWithoutImmediatelyRebanningAndCannotAnonymousRelease()
    {
        var admin = await factory.CreateAdminClientAsync();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            db.IpAccessStates.Add(new IpAccessState { Ip = "2001:db8::1", BannedUntil = DateTime.UtcNow.AddHours(1), NotFound = 40 });
            await db.SaveChangesAsync();
        }
        var path = "/api/v1/admin/security/ips/2001%3Adb8%3A%3A1/release";
        (await factory.CreateClientNoRedirect().PostAsJsonAsync(path, new ReleaseIpRequest("Authorized penetration test"))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var list = await admin.GetFromJsonAsync<JsonElement>("/api/v1/admin/security/ips?status=banned");
        list.GetProperty("total").GetInt32().Should().Be(1);
        (await admin.PostAsJsonAsync(path, new ReleaseIpRequest("Authorized penetration test"))).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var scope2 = factory.Services.CreateScope();
        var db2 = scope2.ServiceProvider.GetRequiredService<AppDbContext>();
        var row = await db2.IpAccessStates.SingleAsync();
        row.BannedUntil.Should().BeNull();
        row.NotFound.Should().Be(0);
        row.ReleasedBy.Should().NotBeNull();
        (await db2.AuditEvents.AnyAsync(x => x.EventType == "admin.ip_released")).Should().BeTrue();
    }
}
