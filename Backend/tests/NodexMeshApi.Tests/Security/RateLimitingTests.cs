using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;
using NodexMeshApi.Auditing;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Security;

public class RateLimitingTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task GateChecksHaveTheirOwnQuotaAndNeverConsumeBrowsingCapacity()
    {
        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:IpRequestsPerMinute"] = "2",
                ["RateLimiting:GateRequestsPerMinute"] = "10"
            })));
        var client = factory.CreateClient();
        for (var i = 0; i < 6; i++)
            (await client.GetAsync("/api/v1/security/ip-check")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        for (var i = 0; i < 2; i++)
            (await client.GetAsync("/api/v1/auth/registration")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync("/api/v1/auth/registration")).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        for (var i = 0; i < 4; i++)
            (await client.GetAsync("/api/v1/security/ip-check")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync("/api/v1/security/ip-check")).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task AnonymousPageReloadRefreshesDoNotBanOrExhaustTheOldThirtyRequestQuota()
    {
        _ = _factory.Services;
        for (var i = 0; i < 40; i++)
        {
            var response = await _factory.Server.SendAsync(http =>
            {
                http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.42");
                http.Request.Path = "/api/v1/auth/refresh";
                http.Request.Method = "POST";
            });
            response.Response.StatusCode.Should().Be(401);
        }
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.IpAccessStates.AnyAsync()).Should().BeFalse();
        (await db.AuditEvents.CountAsync(x => x.EventType == "http.unauthenticated")).Should().Be(40);
    }

    [Fact]
    public async Task FriendlyAddressesBypassGlobalQuotaButRetainAuthenticationLimits()
    {
        using var factory = _factory.WithWebHostBuilder(builder => builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:IpRequestsPerMinute"] = "2",
                ["IpProtection:Allowlist:0"] = "192.0.2.42",
                ["IpProtection:Allowlist:1"] = ""
            })));
        _ = factory.Services;
        for (var i = 0; i < 8; i++)
        {
            var response = await factory.Server.SendAsync(http =>
            {
                http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.42");
                http.Request.Path = "/api/v1/auth/registration";
            });
            response.Response.StatusCode.Should().Be(200);
        }
        using var scope = factory.Services.CreateScope();
        var protection = scope.ServiceProvider.GetRequiredService<IpProtectionService>();
        protection.IsExempt("192.0.2.42").Should().BeTrue();
        // Named authentication quotas still apply even when global browsing is exempt.
        for (var i = 0; i < 6; i++)
        {
            var response = await factory.Server.SendAsync(http =>
            {
                http.Connection.RemoteIpAddress = System.Net.IPAddress.Parse("192.0.2.42");
                http.Request.Path = "/api/v1/auth/login";
                http.Request.Method = "POST";
            });
            response.Response.StatusCode.Should().Be(i < 5 ? 400 : 429);
        }
    }

    [Fact]
    public async Task LoginEndpoint_Returns429_AfterExceedingTheAuthStrictLimit()
    {
        // Program.cs caps "auth-strict" (login/register/revoke/etc.) at 5 requests per
        // minute per partition key. All requests in this test share one HttpClient/one
        // TestServer connection, so they fall into the same rate-limit partition.
        var client = _factory.CreateClientNoRedirect();
        var request = new LoginRequest("nobody@nodexmesh.test", "WrongPassword123!");

        HttpResponseMessage? last = null;
        for (var i = 0; i < 5; i++)
            last = await client.PostAsJsonAsync("/api/v1/auth/login", request);

        last!.StatusCode.Should().Be(HttpStatusCode.Unauthorized); // the 5 permitted requests still process normally

        var sixth = await client.PostAsJsonAsync("/api/v1/auth/login", request);

        sixth.StatusCode.Should().Be((HttpStatusCode)429);
    }

    [Fact]
    public async Task RateLimited429Response_IncludesARetryAfterHeader()
    {
        var client = _factory.CreateClientNoRedirect();
        var request = new LoginRequest("nobody@nodexmesh.test", "WrongPassword123!");

        for (var i = 0; i < 5; i++)
            await client.PostAsJsonAsync("/api/v1/auth/login", request);
        var limited = await client.PostAsJsonAsync("/api/v1/auth/login", request);

        limited.StatusCode.Should().Be((HttpStatusCode)429);
        limited.Headers.RetryAfter.Should().NotBeNull();
    }

    [Fact]
    public async Task RegisterEndpoint_SharesTheSameAuthStrictBucketAsLogin()
    {
        // Both endpoints use the "auth-strict" policy — confirms the partitioning is by
        // caller (IP), not per-route, so an attacker can't dodge the limit by alternating
        // between /login and /register.
        var client = _factory.CreateClientNoRedirect();
        for (var i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/v1/auth/login",
                new LoginRequest("nobody@nodexmesh.test", "WrongPassword123!"));
        }

        var registerAttempt = await client.PostAsJsonAsync("/api/v1/auth/register",
            new RegisterRequest($"{Guid.NewGuid():N}@nodexmesh.test", "Correct#Horse9Battery", "Correct#Horse9Battery", "User", true));

        registerAttempt.StatusCode.Should().Be((HttpStatusCode)429);
    }

    [Fact]
    public async Task UnauthenticatedRegistrationCheck_IsNotRateLimitedByAuthStrict()
    {
        // GET /api/v1/auth/registration has no rate-limiting policy attached — verifies the
        // limiter is applied selectively, not globally overridden for the whole auth group.
        var client = _factory.CreateClientNoRedirect();

        for (var i = 0; i < 10; i++)
        {
            var response = await client.GetAsync("/api/v1/auth/registration");
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }
}
