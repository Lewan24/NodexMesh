namespace NodexMeshApi.Models;

/// <summary>Per-user global default theme — the `defaults` object in the appearance JSON.</summary>
public sealed class AppearanceProfile
{
    public Guid UserId { get; set; }
    public string? Mode { get; set; }
    public string Font { get; set; } = "short-stack";
    public string UiFont { get; set; } = "sans";
    public string UiPrimary { get; set; } = "#8000ff";
    public string UiSecondary { get; set; } = "#6a00eb";
    public int InheritanceVersion { get; set; } = 1;
    public int PaletteVersion { get; set; } = 2;
    public string LightTheme { get; set; } = "{}"; // jsonb: primary/secondary/canvas/default/accent1-5/gradients
    public string DarkTheme { get; set; } = "{}";
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>Per-(user, project) override — the `projects: { <id>: {...} }` map. Null fields inherit.</summary>
public sealed class ProjectAppearanceOverride
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ProjectId { get; set; }
    public string? Mode { get; set; }
    public string? Font { get; set; }
    public string? LightTheme { get; set; }
    public string? DarkTheme { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

/// <summary>
/// Server-side dedupe for BoardMutationDto.ClientMutationId — a retried request with the
/// same key replays the stored response instead of re-applying the mutation.
/// </summary>
public sealed class IdempotencyKey
{
    public Guid ClientMutationId { get; set; }
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public string RequestHash { get; set; } = string.Empty;
    public int ResponseStatus { get; set; }
    public string ResponseBody { get; set; } = "{}";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
