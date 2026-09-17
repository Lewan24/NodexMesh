using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using NodexMeshApi.Common;

namespace NodexMeshApi.Dtos;

public sealed record AdminUserDto(
    Guid Id, string Email, string DisplayName, bool IsAdmin, bool IsBlocked, DateTimeOffset CreatedAt);

public sealed record AdminCreateUserRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(12)] string Password,
    [property: Required, MaxLength(100)] string DisplayName,
    bool IsAdmin = false);

public sealed record AdminResetPasswordRequest([property: Required, MinLength(12)] string Password);

public sealed record AdminUpdateUserRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required, MinLength(1), MaxLength(100)] string DisplayName,
    bool IsAdmin);

public sealed record AdminBlockUserRequest(bool Blocked);

public sealed record AdminRegistrationRequest(bool Enabled);

public sealed record AdminProjectMemberDto(Guid UserId, string Email, string DisplayName, string Role);

public sealed record AdminProjectDto(
    Guid Id, string Name, Guid OwnerId, string OwnerEmail, DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt, DateTimeOffset? DeletedAt, List<AdminProjectMemberDto> Members);

public sealed record AdminAddProjectMemberRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required] string Role) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (!Enum.TryParse<ProjectRole>(Role, out var role) || role is ProjectRole.None or ProjectRole.Owner)
            yield return new ValidationResult("Role must be Editor, Commenter or Viewer.", [nameof(Role)]);
    }
}
