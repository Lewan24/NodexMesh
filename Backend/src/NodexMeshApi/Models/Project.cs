using NodexMeshApi.Common;

namespace NodexMeshApi.Models;

public sealed class Project
{
    public Guid Id { get; set; }
    public Guid OwnerId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }

    public List<Board> Boards { get; set; } = [];
    public List<ProjectMember> Members { get; set; } = [];
    public List<Tag> Tags { get; set; } = [];
}

/// <summary>
/// Invited collaborators. The owner is never a row here — Project.OwnerId already
/// implies ProjectRole.Owner (see ProjectAccessService). Matches ProjectMemberRole
/// from the frontend's types.ts: 'editor' | 'commenter' | 'viewer'.
/// </summary>
public sealed class ProjectMember
{
    public Guid ProjectId { get; set; }
    public Guid UserId { get; set; }
    public ProjectRole Role { get; set; } // Editor | Commenter | Viewer only — never Owner/None
    public DateTimeOffset CreatedAt { get; set; }
    public Guid InvitedBy { get; set; }
}
