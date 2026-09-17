namespace NodexMeshApi.Models;

// Confirmed from types.ts's CommentStatus — was a guess in the earlier draft.
public enum CommentStatus { Open, Todo, InProgress, Resolved }

/// <summary>Item-scoped only — no project-level comments, no threading (matches CommentRecord).</summary>
public sealed class Comment
{
    public Guid Id { get; set; }
    public Guid ItemId { get; set; }
    public Guid AuthorId { get; set; }
    public string Text { get; set; } = string.Empty;
    public CommentStatus Status { get; set; }
    public long Revision { get; set; } = 1;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public Guid UpdatedBy { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
}
