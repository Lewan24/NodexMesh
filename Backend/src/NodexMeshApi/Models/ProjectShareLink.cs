namespace NodexMeshApi.Models;

/// <summary>
/// A capability token granting anonymous, read-only access to one project's boards.
/// </summary>
/// <remarks>
/// The SHA-256 hash remains the anonymous lookup key. An encrypted copy is retained so the
/// project owner can retrieve an existing URL from the owner-authorized sharing dialog.
///
/// The token IS the credential: anyone holding the URL gets in. That makes three things
/// non-negotiable, all enforced in ShareLinkService — high entropy (256 bits), the ability
/// to revoke instantly, and optional expiry so a link pasted into a public Slack channel
/// doesn't stay live forever.
/// </remarks>
public sealed class ProjectShareLink
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }

    /// <summary>SHA-256 (hex) of the raw token. Unique index — this is the lookup key.</summary>
    public string TokenHash { get; set; } = string.Empty;

    /// <summary>Data-protected capability. Null for legacy links.</summary>
    public string? TokenProtected { get; set; }

    /// <summary>Optional owner-facing label ("Link for the client review").</summary>
    public string? Label { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }

    /// <summary>Null means no expiry. Checked on every access.</summary>
    public DateTimeOffset? ExpiresAt { get; set; }

    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? RevokedBy { get; set; }

    /// <summary>
    /// Coarse usage signal for the owner ("is this link being used?"). Deliberately NOT an
    /// access log with IPs — that would make every shared board a visitor-tracking database
    /// and create a GDPR obligation the app doesn't otherwise have.
    /// </summary>
    public DateTimeOffset? LastAccessedAt { get; set; }
    public long AccessCount { get; set; }

    public bool IsActive(DateTimeOffset now) =>
        RevokedAt is null && (ExpiresAt is null || ExpiresAt > now);
}
