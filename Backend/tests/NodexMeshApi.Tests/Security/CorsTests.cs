using FluentAssertions;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Security;

public class CorsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static HttpRequestMessage PreflightRequest(string path, string origin)
    {
        var request = new HttpRequestMessage(HttpMethod.Options, path);
        request.Headers.Add("Origin", origin);
        request.Headers.Add("Access-Control-Request-Method", "POST");
        return request;
    }

    [Fact]
    public async Task Preflight_FromTheConfiguredOrigin_IsAllowed()
    {
        var client = _factory.CreateClientNoRedirect();

        var response = await client.SendAsync(PreflightRequest("/api/v1/auth/login", TestWebApplicationFactory.AllowedOrigin));

        response.Headers.TryGetValues("Access-Control-Allow-Origin", out var allowed).Should().BeTrue();
        allowed!.Should().ContainSingle(TestWebApplicationFactory.AllowedOrigin);
    }

    [Fact]
    public async Task Preflight_FromAnUnlistedOrigin_GetsNoAllowOriginHeader()
    {
        // Deny-by-default: the server never echoes back an origin it wasn't told about.
        // The browser — not the server response code — is what actually blocks the call,
        // so the meaningful assertion is the absence of the header, not the status code.
        var client = _factory.CreateClientNoRedirect();

        var response = await client.SendAsync(PreflightRequest("/api/v1/auth/login", "https://evil-attacker.example"));

        response.Headers.TryGetValues("Access-Control-Allow-Origin", out _).Should().BeFalse();
    }

    [Fact]
    public async Task ActualRequest_FromAnUnlistedOrigin_StillHasNoAllowOriginHeader()
    {
        var client = _factory.CreateClientNoRedirect();
        var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("Origin", "https://evil-attacker.example");

        var response = await client.SendAsync(request);

        response.Headers.TryGetValues("Access-Control-Allow-Origin", out _).Should().BeFalse();
    }

    [Fact]
    public async Task Preflight_AllowsOnlyTheExpectedHttpMethods()
    {
        var client = _factory.CreateClientNoRedirect();
        var request = PreflightRequest("/api/v1/auth/login", TestWebApplicationFactory.AllowedOrigin);

        var response = await client.SendAsync(request);

        response.Headers.TryGetValues("Access-Control-Allow-Methods", out var methods).Should().BeTrue();
        var joined = string.Join(",", methods!);
        joined.Should().NotContain("TRACE");
        joined.Should().NotContain("CONNECT");
    }
}
