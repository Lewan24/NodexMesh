using System.Text.Json;
using System.Text.RegularExpressions;
using NodexMeshApi.Common;

namespace NodexMeshApi.Models;

public sealed record ProjectStatus(Guid Id, string Title, string? Description = null, CustomCssDto? CustomCss = null);

public static class ProjectStatusDefinitions
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);
    public static List<ProjectStatus> Read(string json) => JsonSerializer.Deserialize<List<ProjectStatus>>(json, Options) ?? [];
    public static string Write(IReadOnlyList<ProjectStatus> statuses) => JsonSerializer.Serialize(statuses, Options);

    public static void Validate(IReadOnlyList<ProjectStatus>? statuses)
    {
        if (statuses is null || statuses.Count > 100 || statuses.Any(s => s is null || s.Id == Guid.Empty ||
            string.IsNullOrWhiteSpace(s.Title) || s.Title.Length > 100 || s.Description?.Length > 2000 ||
            (s.CustomCss is { } css && (css.Source is null || css.Source.Length > 10_000 ||
              Regex.IsMatch(css.Source, @"[<\\]|(?:url|image-set|expression)\s*\(|@(?:import|font-face|namespace)|-moz-binding|behavior\s*:", RegexOptions.IgnoreCase)))) ||
            statuses.Select(s => s.Id).Distinct().Count() != statuses.Count ||
            statuses.Select(s => s.Title.Trim().Normalize().ToUpperInvariant()).Distinct().Count() != statuses.Count)
            throw new ApiException(422, "invalid_statuses", "Supply at most 100 unique statuses with titles up to 100 characters, descriptions up to 2000 characters and scoped CSS without external resources.");
    }
}
