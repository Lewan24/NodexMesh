using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

/// <summary>
/// Anonymous, read-only access via a share token. Every route here is unauthenticated, so
/// the rules are stricter than anywhere else in the API:
///
///   1. The token is the ONLY credential; it is never trusted to identify a user.
///   2. Responses go through the Public* DTOs, which carry no user identifiers.
///   3. There is no write path — not even comments.
///   4. Tighter rate limiting, since there is no account to lock out.
///
/// The token travels in the path (not a query string) so it stays out of Referer headers
/// and most access logs. `Referrer-Policy: no-referrer` (see SecurityHeaders) covers the
/// case of a shared board linking out to a third-party site.
/// </summary>
public static class PublicEndpoints
{
    public static void MapPublicEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/public")
            .WithTags("Public")
            .AllowAnonymous()
            .RequireRateLimiting("public-share");

        group.MapGet("/shared/{token}", GetProjectAsync);
        group.MapGet("/shared/{token}/boards/{boardId:guid}", GetBoardAsync);
    }

    private static async Task<Ok<PublicProjectSnapshotDto>> GetProjectAsync(
        string token, AppDbContext db, IShareLinkService shareLinks, CancellationToken ct)
    {
        var projectId = await shareLinks.ResolveProjectIdAsync(token, ct);

        var project = await db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId, ct);

        var boards = await db.Boards.AsNoTracking()
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.SortOrder)
            .Select(b => new PublicBoardDto(b.Id, b.Name, b.SortOrder))
            .ToListAsync(ct);

        return TypedResults.Ok(new PublicProjectSnapshotDto(
            new PublicProjectDto(project.Id, project.Name, project.Color, project.UpdatedAt),
            boards));
    }

    private static async Task<Ok<PublicBoardSnapshotDto>> GetBoardAsync(
        string token, Guid boardId, AppDbContext db, IShareLinkService shareLinks, CancellationToken ct)
    {
        var projectId = await shareLinks.ResolveProjectIdAsync(token, ct);

        // The board must belong to THIS token's project. Without this check a valid token
        // for project A would read any board in the database by id (IDOR).
        var board = await db.Boards.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == boardId && b.ProjectId == projectId, ct)
            ?? throw new ApiException(404, "not_found", "Board not found.");

        var project = await db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId, ct);

        var items = await db.BoardItems.AsNoTracking()
            .Where(i => i.BoardId == boardId)
            .ToListAsync(ct);

        var itemIds = items.Select(i => i.Id).ToHashSet();

        var links = await db.ItemLinks.AsNoTracking()
            .Where(l => itemIds.Contains(l.SourceItemId) && itemIds.Contains(l.TargetItemId))
            .ToListAsync(ct);

        var itemTags = await db.ItemTags.AsNoTracking()
            .Where(t => itemIds.Contains(t.ItemId))
            .ToListAsync(ct);

        var tagIds = itemTags.Select(t => t.TagId).ToHashSet();
        var tags = await db.Tags.AsNoTracking()
            .Where(t => t.ProjectId == projectId && tagIds.Contains(t.Id))
            .ToListAsync(ct);

        // Show the board using the OWNER's theme — an anonymous viewer has no profile of
        // their own, and the owner's per-project override is what makes it look right.
        var appearance = await BuildAppearanceAsync(db, project.OwnerId, projectId, ct);

        return TypedResults.Ok(new PublicBoardSnapshotDto(
            new PublicProjectDto(project.Id, project.Name, project.Color, project.UpdatedAt),
            new PublicBoardDto(board.Id, board.Name, board.SortOrder),
            items.Select(ToPublicDto).ToList(),
            links.Select(l => new ItemLinkDto(l.SourceItemId, l.TargetItemId, ToWireKind(l.Kind))).ToList(),
            tags.Select(t => new TagRecordDto(t.Id, t.ProjectId, t.Name, t.NormalizedName)).ToList(),
            itemTags.Select(t => new ItemTagDto(t.ItemId, t.TagId)).ToList(),
            appearance));
    }

    private static async Task<PublicAppearanceDto?> BuildAppearanceAsync(
        AppDbContext db, Guid ownerId, Guid projectId, CancellationToken ct)
    {
        var profile = await db.AppearanceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == ownerId, ct);

        if (profile is null) return null;

        var over = await db.ProjectAppearanceOverrides.AsNoTracking()
            .FirstOrDefaultAsync(o => o.UserId == ownerId && o.ProjectId == projectId, ct);

        var lightJson = over?.LightTheme ?? profile.LightTheme;
        var darkJson = over?.DarkTheme ?? profile.DarkTheme;

        return new PublicAppearanceDto(
            over?.Font ?? profile.Font,
            Parse(lightJson),
            Parse(darkJson));
    }

    private static JsonElement? Parse(string? json) =>
        string.IsNullOrWhiteSpace(json) ? null : JsonDocument.Parse(json).RootElement;

    private static PublicItemDto ToPublicDto(Models.BoardItem i) => new(
        i.Id, i.BoardId, i.ParentItemId, i.FrameId, i.SortOrder,
        i.PosX, i.PosY, i.Width, i.Height, i.ZIndex, i.Locked,
        i.Type, i.SchemaVersion,
        JsonDocument.Parse(i.Appearance).RootElement,
        JsonDocument.Parse(i.Data).RootElement,
        i.Revision, i.UpdatedAt);

    private static string ToWireKind(Models.ItemLinkKind kind) => kind switch
    {
        Models.ItemLinkKind.LineStart => "line_start",
        Models.ItemLinkKind.LineEnd => "line_end",
        _ => "created_from"
    };
}
