using System.Net;
using System.Text;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using NodexMeshApi.Options;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public sealed class GitHubReleaseServiceTests
{
    [Fact]
    public async Task GetLatestReleaseAsync_CachesTheGitHubResponseForSubsequentCalls()
    {
        var requestCount = 0;
        var handler = new StubHandler(() =>
        {
            requestCount++;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """{"id":42,"tag_name":"v1.2.3","html_url":"https://github.test/release","body":"Changes"}""",
                    Encoding.UTF8,
                    "application/json")
            };
        });
        var factory = new Mock<IHttpClientFactory>();
        factory.Setup(value => value.CreateClient("GitHubReleases")).Returns(new HttpClient(handler));
        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new GitHubReleaseService(
            factory.Object,
            cache,
            Microsoft.Extensions.Options.Options.Create(
                new AppVersionOptions { LatestReleaseApiUrl = "https://api.github.test/releases/latest" }));

        var first = await service.GetLatestReleaseAsync();
        var second = await service.GetLatestReleaseAsync();

        first.TagName.Should().Be("v1.2.3");
        second.Should().BeSameAs(first);
        requestCount.Should().Be(1);
    }

    private sealed class StubHandler(Func<HttpResponseMessage> responseFactory) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(responseFactory());
    }
}
