using Microsoft.AspNetCore.Identity;

namespace NodexMeshApi.Models;

public sealed class ApplicationUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public bool IsBlocked { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class SystemSettings
{
    public int Id { get; set; }
    public bool RegistrationEnabled { get; set; } = true;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/// <summary>
/// Rotating refresh tokens (see TokenService/AuthEndpoints). Only the SHA-256 hash is
/// stored; the raw token exists only in the httpOnly cookie on the client and in memory
/// briefly on the server while issuing it.
/// </summary>
public sealed class RefreshToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public string? CreatedByIp { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
    public string? RevokedByIp { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => RevokedAtUtc is null && ExpiresAtUtc > DateTime.UtcNow;
}
