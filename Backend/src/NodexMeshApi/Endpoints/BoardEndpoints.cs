using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class BoardEndpoints
{
    public static void MapBoardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1").WithTags("Board").RequireAuthorization();

        group.MapGet("/projects/{projectId:guid}/boards", ListBoardsAsync);
        group.MapGet("/boards/{boardId:guid}", GetSnapshotAsync);
        group.MapPost("/boards/{boardId:guid}/mutations", ApplyMutationAsync)
            .RequireRateLimiting("board-mutation");

        group.MapGet("/appearance", GetAppearanceAsync);
        group.MapPut("/appearance", PutAppearanceAsync);
        group.MapPut("/projects/{projectId:guid}/appearance", PutProjectAppearanceAsync);
    }

    private static Guid CurrentUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private static async Task<Ok<List<BoardRecordDto>>> ListBoardsAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);

        var boards = await db.Boards.AsNoTracking()
            .Where(b => b.ProjectId == projectId)
            .OrderBy(b => b.SortOrder)
            .Select(b => new BoardRecordDto(b.Id, b.ProjectId, b.Name, b.SortOrder, b.Revision,
                b.CreatedAt, b.UpdatedAt, b.CreatedBy, b.UpdatedBy, b.DeletedAt))
            .ToListAsync(ct);

        return TypedResults.Ok(boards);
    }

    private static async Task<Ok<BoardSnapshotDto>> GetSnapshotAsync(
        Guid boardId, ClaimsPrincipal principal, IProjectAccessService access,
        IBoardMutationService boards, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireForBoardAsync(boardId, userId, ProjectRole.Viewer, ct);

        return TypedResults.Ok(await boards.GetSnapshotAsync(boardId, ct));
    }

    /// <summary>
    /// The single write path for canvas data. Editor role or above — Viewers and Commenters
    /// get a 403 here even though they can read the same board.
    /// </summary>
    private static async Task<IResult> ApplyMutationAsync(
        Guid boardId, BoardMutationDto mutation, ClaimsPrincipal principal,
        IProjectAccessService access, IBoardMutationService boards, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireForBoardAsync(boardId, userId, ProjectRole.Editor, ct);

        var (status, result) = await boards.ApplyAsync(boardId, userId, mutation, ct);
        return status == 200 ? TypedResults.Ok(result) : TypedResults.Json(result, statusCode: status);
    }

    // ---------------- appearance ----------------

    private static async Task<Ok<object>> GetAppearanceAsync(
        ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var profile = await db.AppearanceProfiles.AsNoTracking()
            .FirstOrDefaultAsync(a => a.UserId == userId, ct)
            ?? throw new ApiException(404, "not_found", "Appearance profile not found.");

        // Only overrides for projects the user can still see — a project they were removed
        // from shouldn't keep leaking its ID back through the theme payload.
        var overrides = await db.ProjectAppearanceOverrides.AsNoTracking()
            .Where(o => o.UserId == userId)
            .Where(o => db.Projects.Any(p => p.Id == o.ProjectId &&
                (p.OwnerId == userId || db.ProjectMembers.Any(m => m.ProjectId == p.Id && m.UserId == userId))))
            .ToListAsync(ct);

        // Shaped to match the frontend's existing appearance JSON exactly.
        return TypedResults.Ok<object>(new
        {
            defaults = new
            {
                font = profile.Font,
                light = System.Text.Json.JsonDocument.Parse(profile.LightTheme).RootElement,
                dark = System.Text.Json.JsonDocument.Parse(profile.DarkTheme).RootElement
            },
            projects = overrides.ToDictionary(
                o => o.ProjectId.ToString(),
                o => (object)new
                {
                    font = o.Font,
                    light = o.LightTheme is null ? null : (object)System.Text.Json.JsonDocument.Parse(o.LightTheme).RootElement,
                    dark = o.DarkTheme is null ? null : (object)System.Text.Json.JsonDocument.Parse(o.DarkTheme).RootElement
                }),
            uiFont = profile.UiFont,
            uiPrimary = profile.UiPrimary,
            uiSecondary = profile.UiSecondary,
            inheritanceVersion = profile.InheritanceVersion,
            paletteVersion = profile.PaletteVersion
        });
    }

    private static async Task<NoContent> PutAppearanceAsync(
        AppearanceUpdateDto request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var profile = await db.AppearanceProfiles.FirstOrDefaultAsync(a => a.UserId == userId, ct);
        if (profile is null)
        {
            profile = new AppearanceProfile { UserId = userId };
            db.AppearanceProfiles.Add(profile);
        }

        profile.Font = request.Font;
        profile.UiFont = request.UiFont;
        profile.UiPrimary = request.UiPrimary;
        profile.UiSecondary = request.UiSecondary;
        profile.InheritanceVersion = request.InheritanceVersion;
        profile.PaletteVersion = request.PaletteVersion;
        profile.LightTheme = request.Light.GetRawText();
        profile.DarkTheme = request.Dark.GetRawText();
        profile.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    /// <summary>
    /// Per-project theme override. Note this is Viewer-level, not Editor: a theme override
    /// is the caller's own private preference row, not a change to the shared project.
    /// </summary>
    private static async Task<NoContent> PutProjectAppearanceAsync(
        Guid projectId, ProjectAppearanceUpdateDto request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);

        var entity = await db.ProjectAppearanceOverrides
            .FirstOrDefaultAsync(o => o.UserId == userId && o.ProjectId == projectId, ct);

        if (entity is null)
        {
            entity = new ProjectAppearanceOverride
            {
                Id = Guid.CreateVersion7(),
                UserId = userId,
                ProjectId = projectId
            };
            db.ProjectAppearanceOverrides.Add(entity);
        }

        entity.Font = request.Font;
        entity.LightTheme = request.Light?.GetRawText();
        entity.DarkTheme = request.Dark?.GetRawText();
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }
}
