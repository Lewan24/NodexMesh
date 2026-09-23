namespace NodexMeshApi.Options;

public sealed class AppVersionOptions
{
    public const string SectionName = "AppVersion";

    public string CurrentVersion { get; init; } = "v0.1.0";
    public string LatestReleaseApiUrl { get; init; } = "https://api.github.com/repos/Lewan24/NodexMesh/releases/latest";
}
