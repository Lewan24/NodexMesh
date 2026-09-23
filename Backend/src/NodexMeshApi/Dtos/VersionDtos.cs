using System.Text.Json;
using System.Text.Json.Serialization;

namespace NodexMeshApi.Dtos;

public sealed class GitHubReleaseDto
{
    [JsonPropertyName("id")]
    public long Id { get; init; }

    [JsonPropertyName("tag_name")]
    public string TagName { get; init; } = string.Empty;

    [JsonPropertyName("name")]
    public string? Name { get; init; }

    [JsonPropertyName("html_url")]
    public string HtmlUrl { get; init; } = string.Empty;

    [JsonPropertyName("body")]
    public string? Body { get; init; }

    [JsonPropertyName("draft")]
    public bool Draft { get; init; }

    [JsonPropertyName("prerelease")]
    public bool Prerelease { get; init; }

    [JsonPropertyName("published_at")]
    public DateTimeOffset? PublishedAt { get; init; }

    [JsonExtensionData]
    public Dictionary<string, JsonElement> AdditionalData { get; init; } = [];
}

public sealed record AppVersionDto(string Version);

public sealed record AppVersionCheckDto(
    string CurrentVersion,
    string LatestVersion,
    bool UpdateAvailable,
    string ReleaseUrl);
