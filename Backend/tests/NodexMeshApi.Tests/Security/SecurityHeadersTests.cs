using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Security;

public class SecurityHeadersTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task ApiResponse_CarriesTheBaselineSecurityHeaders()
    {
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();

        var response = await client.GetAsync("/api/v1/auth/profile");

        response.Headers.GetValues("X-Content-Type-Options").Should().ContainSingle("nosniff");
        response.Headers.GetValues("X-Frame-Options").Should().ContainSingle("DENY");
        response.Headers.GetValues("Referrer-Policy").Should().ContainSingle("no-referrer");
        response.Headers.GetValues("X-Permitted-Cross-Domain-Policies").Should().ContainSingle("none");
        response.Headers.Contains("Permissions-Policy").Should().BeTrue();
    }

    [Fact]
    public async Task ApiResponse_NeverAdvertisesTheServerStack()
    {
        // OWASP A05: fingerprinting the stack is step one of version-specific exploit
        // hunting. Neither Kestrel's own header nor a proxy-added one should survive.
        var client = _factory.CreateClientNoRedirect();
        var response = await client.GetAsync("/health");

        response.Headers.Contains("Server").Should().BeFalse();
    }

    [Fact]
    public async Task ApiResponse_HasAStrictContentSecurityPolicy_NoScriptOrFrameSources()
    {
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();
        var response = await client.GetAsync("/api/v1/auth/profile");

        var csp = response.Headers.GetValues("Content-Security-Policy").Single();
        csp.Should().Contain("default-src 'none'");
        csp.Should().Contain("frame-ancestors 'none'");
    }

    [Fact]
    public async Task AuthenticatedApiResponses_AreNeverCached()
    {
        // Per-user data must never sit in a shared cache or a browser's back/forward
        // cache — a shared machine or a caching proxy must not replay one user's response
        // to the next.
        var (client, _, _, _) = await _factory.CreateSeededUserAsync();
        var response = await client.GetAsync("/api/v1/auth/profile");

        var cacheControl = response.Headers.GetValues("Cache-Control").Single();
        cacheControl.Should().Contain("no-store");
    }

    [Fact]
    public async Task PublicShareEndpoint_AllowsAShortPrivateCache_ButNeverAPublicOne()
    {
        var (owner, _, _, _) = await _factory.CreateSeededUserAsync();
        var created = await owner.PostAsJsonAsync("/api/v1/projects", new CreateProjectRequest("P", null));
        var project = (await created.Content.ReadFromJsonAsync<ProjectRecordDto>())!;
        var link = await owner.PostAsJsonAsync($"/api/v1/projects/{project.Id}/share-links", new CreateShareLinkRequest(null, null));
        var token = (await link.Content.ReadFromJsonAsync<CreatedShareLinkDto>())!.Token;

        var anonymous = _factory.CreateClientNoRedirect();
        var response = await anonymous.GetAsync($"/api/v1/public/shared/{token}");

        var cacheControl = response.Headers.GetValues("Cache-Control").Single();
        cacheControl.Should().Contain("private"); // never "public" — would let a shared proxy serve one viewer's response to another
    }

    [Fact]
    public async Task ErrorResponses_AlsoCarryTheSecurityHeaders()
    {
        // The headers middleware must run for every response, including ones the
        // exception handler writes — a 404/500 is not a special case that skips them.
        var client = _factory.CreateClientNoRedirect();
        var response = await client.GetAsync($"/api/v1/public/shared/{new string('x', 40)}");

        response.Headers.Contains("X-Content-Type-Options").Should().BeTrue();
        response.Headers.Contains("X-Frame-Options").Should().BeTrue();
    }
}
