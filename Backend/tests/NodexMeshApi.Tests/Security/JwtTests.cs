using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.IdentityModel.Tokens;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Security;

public class JwtTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    // Must match TestWebApplicationFactory's Jwt:Key exactly for the "different claims,
    // same key" forgery-adjacent test to be meaningful.
    private const string ConfiguredKey = "test-only-signing-key-not-used-anywhere-else-32chars+";

    public void Dispose() => _factory.Dispose();

    private static async Task<(HttpClient Client, string AccessToken)> GetAuthenticatedTokenAsync(TestWebApplicationFactory factory)
    {
        var (client, _, _, _) = await factory.CreateAuthenticatedUserAsync();
        var token = client.DefaultRequestHeaders.Authorization!.Parameter!;
        return (client, token);
    }

    private static string CraftToken(string key, string issuer, string audience, DateTime expires, Guid? userId = null, string role = "user")
    {
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, (userId ?? Guid.NewGuid()).ToString()),
            new Claim(ClaimTypes.Email, "forged@nodexmesh.test"),
            new Claim(ClaimTypes.Role, role)
        };
        var token = new JwtSecurityToken(issuer, audience, claims, expires: expires, signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task TamperingWithTheSignature_InvalidatesTheToken()
    {
        var (_, token) = await GetAuthenticatedTokenAsync(_factory);
        var parts = token.Split('.');
        // Flip a character deep in the signature segment — an HMAC-SHA256 signature is
        // extremely sensitive to single-bit changes.
        var mutatedSignature = parts[2][..^1] + (parts[2][^1] == 'A' ? 'B' : 'A');
        var tampered = $"{parts[0]}.{parts[1]}.{mutatedSignature}";

        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tampered);
        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TokenSignedWithAWrongKey_IsRejected()
    {
        var forged = CraftToken("a-completely-different-32-plus-char-key!!", "https://nodexmesh.test", "nodexmesh-web", DateTime.UtcNow.AddMinutes(15));

        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);
        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ExpiredToken_IsRejected_EvenWithAValidSignature()
    {
        // Signed with the real configured key, but already expired — proves ValidateLifetime
        // is actually enforced and not just present in config.
        var expired = CraftToken(ConfiguredKey, "https://nodexmesh.test", "nodexmesh-web", DateTime.UtcNow.AddMinutes(-1));

        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", expired);
        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TokenForANonexistentUser_IsRejected()
    {
        // Correctly signed, unexpired, right issuer/audience — but the subject doesn't
        // correspond to any real account. OnTokenValidated must still catch this.
        var forged = CraftToken(ConfiguredKey, "https://nodexmesh.test", "nodexmesh-web",
            DateTime.UtcNow.AddMinutes(15), userId: Guid.NewGuid());

        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);
        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TokenWithWrongAudience_IsRejected()
    {
        var forged = CraftToken(ConfiguredKey, "https://nodexmesh.test", "some-other-audience", DateTime.UtcNow.AddMinutes(15));

        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", forged);
        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task MissingBearerPrefix_IsRejected()
    {
        var (_, token) = await GetAuthenticatedTokenAsync(_factory);
        var client = _factory.CreateClientNoRedirect();
        client.DefaultRequestHeaders.TryAddWithoutValidation("Authorization", token); // no "Bearer " scheme

        var response = await client.GetAsync("/api/v1/auth/profile");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task PromotingAUserToAdmin_InvalidatesTheirExistingAccessToken()
    {
        // The token's "role" claim is baked in at issue time. OnTokenValidated compares it
        // against the user's CURRENT role on every request, so a role change (in either
        // direction) forces re-authentication instead of silently granting/revoking
        // privileges mid-session on stale tokens.
        var admin = await _factory.CreateAdminClientAsync();
        var (targetClient, targetId, targetEmail, _) = await _factory.CreateAuthenticatedUserAsync();

        (await targetClient.GetAsync("/api/v1/auth/profile")).StatusCode.Should().Be(HttpStatusCode.OK);

        await admin.PutAsJsonAsync($"/api/v1/admin/users/{targetId}",
            new AdminUpdateUserRequest(targetEmail, "Promoted User", IsAdmin: true));

        var afterPromotion = await targetClient.GetAsync("/api/v1/auth/profile");
        afterPromotion.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
