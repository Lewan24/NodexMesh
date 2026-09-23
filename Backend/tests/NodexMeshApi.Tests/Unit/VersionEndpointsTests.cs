using FluentAssertions;
using NodexMeshApi.Endpoints;
using Xunit;

namespace NodexMeshApi.Tests.Unit;

public sealed class VersionEndpointsTests
{
    [Theory]
    [InlineData("v1.2.3", "1.2.3")]
    [InlineData("V2.0.0", "2.0.0")]
    [InlineData(" 1.0.4 ", "1.0.4")]
    public void NormalizeVersion_RemovesTheTagPrefix(string value, string expected)
    {
        VersionEndpoints.NormalizeVersion(value).Should().Be(expected);
    }

    [Theory]
    [InlineData("1.2.4", "1.2.3", true)]
    [InlineData("2.0.0", "1.99.99", true)]
    [InlineData("1.2.3", "1.2.3", false)]
    [InlineData("1.2.2", "1.2.3", false)]
    public void IsNewerVersion_UsesNumericVersionOrdering(string candidate, string current, bool expected)
    {
        VersionEndpoints.IsNewerVersion(candidate, current).Should().Be(expected);
    }
}
