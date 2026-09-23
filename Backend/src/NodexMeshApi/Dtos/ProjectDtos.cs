using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace NodexMeshApi.Dtos;

/// <param name="Role">
/// The *calling* user's role on this project ("Owner" | "Editor" | "Commenter" | "Viewer") —
/// drives what the UI enables. Not a property of the project itself.
/// </param>
public sealed record ProjectRecordDto(
    Guid Id, Guid OwnerId, string Name, string? Color,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long Revision,
    DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt,
    Guid? CreatedBy, Guid? UpdatedBy, DateTimeOffset? DeletedAt,
    string Role, int ItemCount = 0);

public sealed record ProjectSnapshotDto(ProjectRecordDto Project, BoardSnapshotDto Board);

public sealed record CreateProjectRequest(
    [property: Required, MaxLength(200)] string Name,
    [property: RegularExpression("^#[0-9a-fA-F]{6}$")] string? Color);

public sealed record UpdateProjectRequest(
    [property: MaxLength(200)] string? Name,
    [property: RegularExpression("^#[0-9a-fA-F]{6}$")] string? Color,
    [property: Required, JsonConverter(typeof(RevisionJsonConverter))] long ExpectedRevision);

public sealed record ProjectMemberDto(Guid UserId, string Email, string? DisplayName, string Role, DateTimeOffset CreatedAt);
public sealed record ProjectParticipantDto(Guid UserId, string DisplayName, string Role);

/// <summary>
/// Invite by email rather than by user ID: the caller shouldn't be able to enumerate
/// internal user IDs, and the email is what they actually know.
/// </summary>
public sealed record InviteMemberRequest(
    [property: Required, EmailAddress, MaxLength(256)] string Email,
    [property: Required] string Role) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        // Owner is implicit from Project.OwnerId and can never be granted via invite —
        // transferring ownership is a separate, deliberate operation.
        if (Role is not ("Editor" or "Commenter" or "Viewer"))
            yield return new ValidationResult("Role must be Editor, Commenter or Viewer.", [nameof(Role)]);
    }
}

public sealed record UpdateMemberRoleRequest([property: Required] string Role) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext context)
    {
        if (Role is not ("Editor" or "Commenter" or "Viewer"))
            yield return new ValidationResult("Role must be Editor, Commenter or Viewer.", [nameof(Role)]);
    }
}

public sealed record CreateTagRequest([property: Required, MaxLength(64)] string Name);
