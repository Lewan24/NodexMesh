using System.ComponentModel.DataAnnotations;

namespace NodexMeshApi.Dtos;

public sealed record MfaStartRequest(
    [property: Required, MaxLength(256)] string CurrentPassword,
    bool Enabled,
    [property: Required, RegularExpression("^(email|authenticator)$")] string PreferredMethod);

public sealed record MfaCompleteRequest(
    [property: Required, MaxLength(128)] string ChallengeToken,
    [property: Required, MaxLength(64)] string Code,
    [property: MaxLength(6)] string? SetupCode = null);

public sealed record MfaChallengeResponse(
    bool MfaRequired, string ChallengeToken, string Method, DateTimeOffset ExpiresAt,
    string? SetupSecret = null, string? SetupUri = null);
