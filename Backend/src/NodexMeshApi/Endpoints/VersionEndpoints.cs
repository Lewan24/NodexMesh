using Microsoft.Extensions.Options;
using NodexMeshApi.Dtos;
using NodexMeshApi.Options;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class VersionEndpoints
{
    public static void MapVersionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/version")
            .WithTags("Version")
            .AllowAnonymous();

        group.MapGet("", GetCurrentVersion);
        group.MapGet("/latest", GetLatestReleaseAsync);
        group.MapGet("/check", CheckForUpdateAsync);
    }

    private static IResult GetCurrentVersion(IOptions<AppVersionOptions> options) =>
        Results.Ok(new AppVersionDto(NormalizeVersion(options.Value.CurrentVersion)));

    private static async Task<IResult> GetLatestReleaseAsync(IGitHubReleaseService releases, CancellationToken ct)
    {
        try
        {
            return Results.Ok(await releases.GetLatestReleaseAsync(ct));
        }
        catch (Exception exception) when (exception is HttpRequestException or InvalidDataException or TaskCanceledException)
        {
            return GitHubUnavailable();
        }
    }

    private static async Task<IResult> CheckForUpdateAsync(
        IGitHubReleaseService releases,
        IOptions<AppVersionOptions> options,
        CancellationToken ct)
    {
        try
        {
            var release = await releases.GetLatestReleaseAsync(ct);
            var currentVersion = NormalizeVersion(options.Value.CurrentVersion);
            var latestVersion = NormalizeVersion(release.TagName);

            return Results.Ok(new AppVersionCheckDto(
                currentVersion,
                latestVersion,
                IsNewerVersion(latestVersion, currentVersion),
                release.HtmlUrl));
        }
        catch (Exception exception) when (exception is HttpRequestException or InvalidDataException or TaskCanceledException)
        {
            return GitHubUnavailable();
        }
    }

    public static string NormalizeVersion(string version) => version.Trim().TrimStart('v', 'V');

    public static bool IsNewerVersion(string candidate, string current)
    {
        if (!Version.TryParse(NormalizeVersion(candidate), out var candidateVersion))
            throw new InvalidDataException($"The release tag '{candidate}' is not a valid version.");
        if (!Version.TryParse(NormalizeVersion(current), out var currentVersion))
            throw new InvalidDataException($"The configured app version '{current}' is not valid.");

        return candidateVersion > currentVersion;
    }

    private static IResult GitHubUnavailable() => Results.Problem(
        statusCode: StatusCodes.Status502BadGateway,
        title: "The latest release could not be retrieved from GitHub.");
}
