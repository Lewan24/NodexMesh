using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using NodexMeshApi.Dtos;
using NodexMeshApi.Tests.Infrastructure;
using Xunit;

namespace NodexMeshApi.Tests.Endpoints;

public sealed class VersionEndpointsTests : IDisposable
{
    private readonly TestWebApplicationFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task GetCurrentVersion_IsAvailableWithoutAuthentication()
    {
        var client = _factory.CreateClientNoRedirect();

        var response = await client.GetAsync("/api/v1/version");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<AppVersionDto>();
        result!.Version.Should().NotStartWith("v");
        Version.TryParse(result.Version, out _).Should().BeTrue();
    }
}
