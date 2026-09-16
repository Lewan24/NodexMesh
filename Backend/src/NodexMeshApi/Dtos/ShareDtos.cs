using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NodexMeshApi.Dtos;

// ---------------- owner-facing management ----------------

public sealed record CreateShareLinkRequest(
    [property: MaxLength(100)] string? Label,
    DateTimeOffset? ExpiresAt);

/// <summary>Share link metadata. Deliberately contains no token — see CreatedShareLinkDto.</summary>
public sealed record ShareLinkDto(
    Guid Id, Guid ProjectId, string? Label,
    DateTimeOffset CreatedAt, DateTimeOffset? ExpiresAt,
    DateTimeOffset? LastAccessedAt, long AccessCount, bool IsActive);

/// <summary>
/// Returned ONLY from the create call. <paramref name="Token"/> is the raw credential and
/// is unrecoverable afterwards (only its hash is stored), so the UI must surface it
/// immediately with a copy button and a "you won't see this again" note.
/// </summary>
public sealed record CreatedShareLinkDto(ShareLinkDto Link, string Token);

// ---------------- anonymous, read-only ----------------

/// <summary>
/// Project metadata for anonymous viewers. Compared with ProjectRecordDto this drops
/// ownerId, createdBy, updatedBy, revision and deletedAt: a public viewer has no use for
/// them, and ownerId/createdBy are user identifiers that would leak who owns the board.
/// </summary>
public sealed record PublicProjectDto(
    Guid Id, string Name, string? Color, DateTimeOffset UpdatedAt);

public sealed record PublicBoardDto(Guid Id, string Name, int SortOrder);

/// <summary>
/// Board item for anonymous viewers: geometry, appearance and content only. Audit fields
/// (createdBy/updatedBy) are stripped because they are user GUIDs.
/// </summary>
public sealed record PublicItemDto(
    Guid Id, Guid BoardId, Guid? ParentItemId, Guid? FrameId, long SortOrder,
    double X, double Y, double? Width, double? Height, int ZIndex, bool Locked,
    string Type, short SchemaVersion, JsonElement Appearance, JsonElement Data,
    [property: JsonConverter(typeof(RevisionJsonConverter))] long Revision,
    DateTimeOffset UpdatedAt);

/// <summary>
/// The anonymous read-only payload.
/// </summary>
/// <remarks>
/// Comments are omitted entirely rather than sanitised. They carry author identity and are
/// typically internal working notes ("ask legal about this", "@tom this number is wrong") —
/// publishing them alongside a board that was shared for viewing would surprise the owner.
/// If public comment visibility is wanted later it should be an explicit per-link opt-in,
/// not a default.
/// </remarks>
public sealed record PublicBoardSnapshotDto(
    PublicProjectDto Project,
    PublicBoardDto Board,
    IReadOnlyList<PublicItemDto> Items,
    IReadOnlyList<ItemLinkDto> Links,
    IReadOnlyList<TagRecordDto> Tags,
    IReadOnlyList<ItemTagDto> ItemTags,
    PublicAppearanceDto? Appearance);

/// <summary>
/// The owner's theme for this project, so a shared board looks the way the owner made it.
/// Purely presentational — no user identifiers.
/// </summary>
public sealed record PublicAppearanceDto(
    string Font, JsonElement? Light, JsonElement? Dark);

/// <summary>Entry point for a share token: the project plus the list of its boards.</summary>
public sealed record PublicProjectSnapshotDto(
    PublicProjectDto Project,
    IReadOnlyList<PublicBoardDto> Boards);
