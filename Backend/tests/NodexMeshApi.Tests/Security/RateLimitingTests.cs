using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Security;

public class RateLimitingTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

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
