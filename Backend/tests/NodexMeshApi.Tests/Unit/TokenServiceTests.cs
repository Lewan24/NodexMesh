using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class TokenServiceTests
{
    private static ITokenService CreateService(double accessTokenMinutes = 15)
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "unit-test-signing-key-at-least-32-characters!",
            ["Jwt:Issuer"] = "https://issuer.test",
            ["Jwt:Audience"] = "nodexmesh-web",
            ["Jwt:AccessTokenMinutes"] = accessTokenMinutes.ToString(),
        }).Build();

        return new TokenService(config);
    }

    private static ApplicationUser MakeUser(bool isAdmin = false) => new()
    {
        Id = Guid.NewGuid(),
        Email = "person@example.com",
        UserName = "person@example.com",
        IsAdmin = isAdmin
    };

    [Fact]
    public void GenerateAccessToken_EmbedsUserIdentityClaims()
    {
        var service = CreateService();
        var user = MakeUser();

        var (token, _) = service.GenerateAccessToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.First(c => c.Type == ClaimTypes.NameIdentifier).Value.Should().Be(user.Id.ToString());
        jwt.Claims.First(c => c.Type == ClaimTypes.Email).Value.Should().Be(user.Email);
        jwt.Issuer.Should().Be("https://issuer.test");
        jwt.Audiences.Should().Contain("nodexmesh-web");
    }

    [Theory]
    [InlineData(false, "user")]
    [InlineData(true, "admin")]
    public void GenerateAccessToken_RoleClaimReflectsIsAdmin(bool isAdmin, string expectedRole)
    {
        var service = CreateService();
        var user = MakeUser(isAdmin);

        var (token, _) = service.GenerateAccessToken(user);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.First(c => c.Type == ClaimTypes.Role).Value.Should().Be(expectedRole);
    }

    [Fact]
    public void GenerateAccessToken_NeverPutsProjectRolesInTheToken()
    {
        // Project permissions must be re-checked per request (ProjectAccessService), not
        // cached in the JWT — otherwise revoking a collaborator wouldn't take effect until
        // their token expired. This asserts the token carries only identity claims.
        var service = CreateService();
        var (token, _) = service.GenerateAccessToken(MakeUser());
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        var claimTypes = jwt.Claims.Select(c => c.Type).ToHashSet();
        claimTypes.Should().NotContain("project_role");
        claimTypes.Should().NotContain("projectId");
    }

    [Fact]
    public void GenerateAccessToken_ExpiryRespectsConfiguredMinutes()
    {
        var service = CreateService(accessTokenMinutes: 5);
        var before = DateTime.UtcNow;
        var (_, expiresAtUtc) = service.GenerateAccessToken(MakeUser());

        expiresAtUtc.Should().BeCloseTo(before.AddMinutes(5), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void GenerateAccessToken_TwoTokensForSameUserHaveDifferentJti()
    {
        // Guards against accidental determinism that would make tokens replayable/comparable.
        var service = CreateService();
        var user = MakeUser();

        var (t1, _) = service.GenerateAccessToken(user);
        var (t2, _) = service.GenerateAccessToken(user);

        var jti1 = new JwtSecurityTokenHandler().ReadJwtToken(t1).Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;
        var jti2 = new JwtSecurityTokenHandler().ReadJwtToken(t2).Claims.First(c => c.Type == JwtRegisteredClaimNames.Jti).Value;

        jti1.Should().NotBe(jti2);
        t1.Should().NotBe(t2);
    }

    [Fact]
    public void GenerateRefreshToken_ProducesHighEntropyUniqueTokens()
    {
        var service = CreateService();
        var (token1, _, _) = service.GenerateRefreshToken();
        var (token2, _, _) = service.GenerateRefreshToken();

        token1.Should().NotBe(token2);
        // 64 random bytes, base64-encoded, is comfortably >= 80 characters.
        token1.Length.Should().BeGreaterThan(80);
    }

    [Fact]
    public void GenerateRefreshToken_ExpiresInSevenDays()
    {
        var service = CreateService();
        var before = DateTime.UtcNow;
        var (_, _, expiresAtUtc) = service.GenerateRefreshToken();

        expiresAtUtc.Should().BeCloseTo(before.AddDays(7), TimeSpan.FromMinutes(1));
    }

    [Fact]
    public void GenerateRefreshToken_HashMatchesWhatHashTokenProducesForTheRawToken()
    {
        // The service must be internally consistent: the hash it returns alongside a
        // freshly minted token is exactly what HashToken(token) recomputes later at login.
        var service = CreateService();
        var (token, hash, _) = service.GenerateRefreshToken();

        service.HashToken(token).Should().Be(hash);
    }

    [Fact]
    public void HashToken_IsDeterministicAndCaseSensitive()
    {
        var service = CreateService();
        var hashA = service.HashToken("some-raw-token-value");
        var hashB = service.HashToken("some-raw-token-value");
        var hashC = service.HashToken("Some-Raw-Token-Value");

        hashA.Should().Be(hashB);
        hashA.Should().NotBe(hashC);
    }

    [Fact]
    public void HashToken_NeverReturnsTheRawTokenItself()
    {
        // The whole point of hashing: even if the hash column leaked, it must not be (or
        // trivially reveal) the raw bearer credential.
        var service = CreateService();
        const string raw = "super-secret-refresh-token-value";

        service.HashToken(raw).Should().NotBe(raw).And.NotContain(raw);
    }
}
