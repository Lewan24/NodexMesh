using System.Net.Http.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using NodexMeshApi.Dtos;
using NodexMeshApi.Options;

namespace NodexMeshApi.Services;

public interface IGitHubReleaseService
{
    Task<GitHubReleaseDto> GetLatestReleaseAsync(CancellationToken ct = default);
}

public sealed class GitHubReleaseService(
    IHttpClientFactory httpClientFactory,
    IMemoryCache cache,
    IOptions<AppVersionOptions> options) : IGitHubReleaseService
{
    private const string LatestReleaseCacheKey = "github-release:Lewan24/NodexMesh:latest";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);
    private readonly SemaphoreSlim _refreshLock = new(1, 1);

    public async Task<GitHubReleaseDto> GetLatestReleaseAsync(CancellationToken ct = default)
    {
        if (cache.TryGetValue(LatestReleaseCacheKey, out GitHubReleaseDto? cached) && cached is not null)
            return cached;

        await _refreshLock.WaitAsync(ct);
        try
        {
            if (cache.TryGetValue(LatestReleaseCacheKey, out cached) && cached is not null)
                return cached;

            using var client = httpClientFactory.CreateClient("GitHubReleases");
            using var response = await client.GetAsync(options.Value.LatestReleaseApiUrl, ct);
            response.EnsureSuccessStatusCode();

            var release = await response.Content.ReadFromJsonAsync<GitHubReleaseDto>(cancellationToken: ct)
                ?? throw new InvalidDataException("GitHub returned an empty release response.");

            if (string.IsNullOrWhiteSpace(release.TagName) || string.IsNullOrWhiteSpace(release.HtmlUrl))
                throw new InvalidDataException("GitHub returned an incomplete release response.");

            cache.Set(LatestReleaseCacheKey, release, CacheDuration);
            return release;
        }
        finally
        {
            _refreshLock.Release();
        }
    }
}
