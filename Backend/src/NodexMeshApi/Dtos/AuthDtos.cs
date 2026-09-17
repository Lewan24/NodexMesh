using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace NodexMeshApi.Dtos;

/// <summary>
/// The refresh token is intentionally NOT here. It travels as an httpOnly, Secure cookie
/// so JavaScript — and therefore XSS — can never read it. Only the short-lived access
/// token goes in the JSON body, where the SPA holds it in memory.
/// </summary>
public record UserProfileResponse(Guid Id, string Email, string DisplayName, bool IsAdmin);

public record AuthResponse(string AccessToken, DateTime ExpiresAtUtc, UserProfileResponse User);

public record RegisteredUserResponse(Guid Id, string Email);

public record LoginRequest(
    [property: Required, EmailAddress] string Email,
    [property: Required] string Password);

public sealed record UpdateProfileRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(1), MaxLength(100)] string DisplayName,
    string? CurrentPassword);

public sealed record ChangePasswordRequest(
    [property: Required] string CurrentPassword,
    [property: Required, MinLength(12)] string NewPassword,
    [property: Required] string ConfirmPassword) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (NewPassword != ConfirmPassword)
            yield return new ValidationResult("Passwords do not match.", [nameof(ConfirmPassword)]);
    }
}

public record RegisterRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required]
    [property: MinLength(12, ErrorMessage = "Password must be at least 12 characters long.")]
    string Password,
    [property: Required] string ConfirmPassword,
    [property: MaxLength(100)] string? DisplayName) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!Regex.IsMatch(Password, "[A-Z]"))
            yield return new ValidationResult("Password must contain an uppercase letter.", [nameof(Password)]);

        if (!Regex.IsMatch(Password, "[a-z]"))
            yield return new ValidationResult("Password must contain a lowercase letter.", [nameof(Password)]);

        if (!Regex.IsMatch(Password, "[0-9]"))
            yield return new ValidationResult("Password must contain a digit.", [nameof(Password)]);

        if (!Regex.IsMatch(Password, @"[^a-zA-Z0-9]"))
            yield return new ValidationResult("Password must contain a special character.", [nameof(Password)]);

        if (Password != ConfirmPassword)
            yield return new ValidationResult("Passwords do not match.", [nameof(ConfirmPassword)]);
    }
}
