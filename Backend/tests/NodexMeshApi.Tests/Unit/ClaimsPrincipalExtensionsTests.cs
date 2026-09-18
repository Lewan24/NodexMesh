using System.Security.Claims;
using FluentAssertions;
using NodexMeshApi.Common;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public class ClaimsPrincipalExtensionsTests
{
    private static ClaimsPrincipal PrincipalWith(string? nameIdentifier)
    {
        var claims = new List<Claim>();
        if (nameIdentifier is not null) claims.Add(new Claim(ClaimTypes.NameIdentifier, nameIdentifier));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"));
    }

    [Fact]
    public void GetUserId_ParsesAValidGuidClaim()
    {
        var id = Guid.NewGuid();
        var principal = PrincipalWith(id.ToString());

        principal.GetUserId().Should().Be(id);
    }

    [Fact]
    public void GetUserId_ThrowsUnauthorized_WhenClaimIsMissing()
    {
        // A token that authenticated but carries no subject must not surface as a 500 —
        // it's an authentication problem an anonymous caller could otherwise trigger at will.
        var principal = PrincipalWith(null);

        var act = () => principal.GetUserId();
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 401);
    }

    [Theory]
    [InlineData("not-a-guid")]
    [InlineData("")]
    [InlineData("1; DROP TABLE users;")]
    public void GetUserId_ThrowsUnauthorized_WhenClaimIsMalformed(string malformed)
    {
        var principal = PrincipalWith(malformed);

        var act = () => principal.GetUserId();
        act.Should().Throw<ApiException>().Where(e => e.StatusCode == 401 && e.Code == "unauthorized");
    }
}
