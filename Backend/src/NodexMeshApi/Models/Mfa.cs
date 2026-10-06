namespace NodexMeshApi.Models;

/// <summary>Opaque, short-lived proof of password verification; never an authenticated session.</summary>
public sealed class MfaChallenge
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string TokenHash { get; set; } = string.Empty;
    public string SecurityStamp { get; set; } = string.Empty;
    public string Purpose { get; set; } = "login";
    public string Method { get; set; } = "authenticator";
    public string? EmailCodeHash { get; set; }
    public string? SetupSecretProtected { get; set; }
    public bool TargetEnabled { get; set; }
    public string TargetMethod { get; set; } = "email";
    public DateTimeOffset ExpiresAt { get; set; }
    public int Attempts { get; set; }
    public bool Consumed { get; set; }
}

public sealed class MfaRecoveryCode
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string CodeHash { get; set; } = string.Empty;
    public bool Consumed { get; set; }
}
