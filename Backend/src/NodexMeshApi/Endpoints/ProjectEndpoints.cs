using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public static class ProjectEndpoints
{
    public static void MapProjectEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/projects")
            .WithTags("Projects")
            .RequireAuthorization();

        group.MapGet("/", ListAsync);
        group.MapPost("/", CreateAsync);
        group.MapGet("/{projectId:guid}", GetAsync);
        group.MapPatch("/{projectId:guid}", UpdateAsync);
        group.MapDelete("/{projectId:guid}", TrashAsync);
        group.MapPost("/{projectId:guid}/restore", RestoreAsync);
        group.MapDelete("/{projectId:guid}/permanent", PurgeAsync);

        group.MapPost("/{projectId:guid}/tags", CreateTagAsync);

        group.MapGet("/{projectId:guid}/members", ListMembersAsync);
        group.MapPost("/{projectId:guid}/members", InviteMemberAsync);
        group.MapPatch("/{projectId:guid}/members/{userId:guid}", UpdateMemberRoleAsync);
        group.MapDelete("/{projectId:guid}/members/{userId:guid}", RemoveMemberAsync);

        // Anonymous read-only share links (owner-managed). The public read side lives in
        // PublicEndpoints and is unauthenticated.
        group.MapGet("/{projectId:guid}/share-links", ListShareLinksAsync);
        group.MapPost("/{projectId:guid}/share-links", CreateShareLinkAsync);
        group.MapDelete("/{projectId:guid}/share-links/{linkId:guid}", RevokeShareLinkAsync);
    }

    // Delegates to ClaimsPrincipalExtensions.GetUserId, which returns 401 rather than
    // throwing (and 500-ing) on a token with a missing or malformed subject claim.
    private static Guid CurrentUserId(ClaimsPrincipal user) => user.GetUserId();

    /// <summary>Projects the user owns *or* has been invited to.</summary>
    private static async Task<Ok<List<ProjectRecordDto>>> ListAsync(
        ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var owned = await db.Projects.IgnoreQueryFilters().AsNoTracking()
            .Where(p => p.OwnerId == userId)
            .ToListAsync(ct);

        var shared = await db.Projects.AsNoTracking()
            .Where(p => db.ProjectMembers.Any(m => m.ProjectId == p.Id && m.UserId == userId))
            .Join(db.ProjectMembers.Where(m => m.UserId == userId),
                p => p.Id, m => m.ProjectId, (p, m) => new { Project = p, m.Role })
            .ToListAsync(ct);

        var result = owned.Select(p => ToDto(p, ProjectRole.Owner))
            .Concat(shared.Select(s => ToDto(s.Project, s.Role)))
            .OrderByDescending(p => p.UpdatedAt)
            .ToList();

        return TypedResults.Ok(result);
    }

    private static async Task<Ok<ProjectRecordDto>> CreateAsync(
        CreateProjectRequest request, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var now = DateTimeOffset.UtcNow;

        var project = new Project
        {
            Id = Guid.CreateVersion7(),
            OwnerId = userId,
            Name = request.Name,
            Color = request.Color ?? "#7C3AED",
            Revision = 1,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = userId,
            UpdatedBy = userId
        };
        db.Projects.Add(project);

        // One board per project, matching the current UI.
        db.Boards.Add(new Models.Board
        {
            Id = Guid.CreateVersion7(),
            ProjectId = project.Id,
            Name = "Board",
            SortOrder = 0,
            Revision = 1,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedBy = userId,
            UpdatedBy = userId
        });

        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(ToDto(project, ProjectRole.Owner));
    }

    private static async Task<Ok<ProjectRecordDto>> GetAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var role = await access.GetRoleAsync(projectId, userId, ct);
        if (role == ProjectRole.None) throw new ApiException(404, "not_found", "Project not found.");

        var project = await db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId, ct);
        return TypedResults.Ok(ToDto(project, role));
    }

    private static async Task<Ok<ProjectRecordDto>> UpdateAsync(
        Guid projectId, UpdateProjectRequest request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Editor, ct);

        var project = await db.Projects.FirstAsync(p => p.Id == projectId, ct);
        if (project.Revision != request.ExpectedRevision)
            throw new ApiException(409, "revision_mismatch", "The project was changed by someone else.");

        if (request.Name is not null) project.Name = request.Name;
        if (request.Color is not null) project.Color = request.Color;
        project.Revision += 1;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        project.UpdatedBy = userId;

        await db.SaveChangesAsync(ct);

        var role = await access.GetRoleAsync(projectId, userId, ct);
        return TypedResults.Ok(ToDto(project, role));
    }

    /// <summary>Soft delete (trash bin) — only the owner may trash a shared project.</summary>
    private static async Task<NoContent> TrashAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Owner, ct);

        var project = await db.Projects.FirstAsync(p => p.Id == projectId, ct);
        project.DeletedAt = DateTimeOffset.UtcNow;
        project.Revision += 1;
        project.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    private static async Task<NoContent> PurgeAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var project = await db.Projects.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, ct)
            ?? throw new ApiException(404, "not_found", "Project not found.");
        if (project.DeletedAt is null)
            throw new ApiException(409, "not_trashed", "Move the project to trash before deleting it permanently.");
        var boardIds = db.Boards.IgnoreQueryFilters().Where(b => b.ProjectId == projectId).Select(b => b.Id);
        var itemIds = db.BoardItems.IgnoreQueryFilters().Where(i => boardIds.Contains(i.BoardId)).Select(i => i.Id);
        db.ItemLinks.RemoveRange(await db.ItemLinks
            .Where(link => itemIds.Contains(link.SourceItemId) || itemIds.Contains(link.TargetItemId)).ToListAsync(ct));
        db.ProjectAppearanceOverrides.RemoveRange(await db.ProjectAppearanceOverrides
            .Where(value => value.ProjectId == projectId).ToListAsync(ct));
        db.UserClaims.RemoveRange(await db.UserClaims
            .Where(claim => claim.ClaimType == "default_project" && claim.ClaimValue == projectId.ToString()).ToListAsync(ct));
        db.Projects.Remove(project);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> RestoreAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        // IgnoreQueryFilters: restoring is the one operation that must see trashed rows.
        // Ownership is still checked explicitly here since ProjectAccessService (correctly)
        // can't see soft-deleted projects.
        var project = await db.Projects.IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == projectId && p.OwnerId == userId, ct)
            ?? throw new ApiException(404, "not_found", "Project not found.");

        project.DeletedAt = null;
        project.Revision += 1;
        project.UpdatedAt = DateTimeOffset.UtcNow;
        project.UpdatedBy = userId;
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    private static async Task<Ok<TagRecordDto>> CreateTagAsync(
        Guid projectId, CreateTagRequest request, ClaimsPrincipal principal, TagService tags, CancellationToken ct)
    {
        return TypedResults.Ok(await tags.GetOrCreateAsync(projectId, CurrentUserId(principal), request.Name, ct));
    }

    // ---------------- sharing ----------------

    /// <summary>
    /// Collaborators on the project. Non-owners see display names but MASKED email
    /// addresses: a board shared with a dozen people shouldn't hand every one of them a
    /// harvestable list of the others' addresses. The owner, who invited them all by
    /// email in the first place, sees the real values.
    /// </summary>
    private static async Task<Ok<List<ProjectMemberDto>>> ListMembersAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        var role = await access.GetRoleAsync(projectId, userId, ct);
        if (role == ProjectRole.None) throw new ApiException(404, "not_found", "Project not found.");

        var rows = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == projectId)
            .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new
            {
                u.Id,
                Email = u.Email!,
                u.DisplayName,
                Role = m.Role,
                m.CreatedAt
            })
            .ToListAsync(ct);

        var isOwner = role == ProjectRole.Owner;

        var members = rows.Select(r => new ProjectMemberDto(
            r.Id,
            // Callers always see their own address in full.
            isOwner || r.Id == userId ? r.Email : MaskEmail(r.Email),
            r.DisplayName,
            r.Role.ToString(),
            r.CreatedAt)).ToList();

        return TypedResults.Ok(members);
    }

    /// <summary>"alice.smith@example.com" -> "a***h@example.com". Enough for a human to
    /// recognise an address they already know, not enough to harvest one they don't.</summary>
    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 0) return "***";

        var local = email[..at];
        var domain = email[at..];

        return local.Length <= 2
            ? $"{local[0]}***{domain}"
            : $"{local[0]}***{local[^1]}{domain}";
    }

    // ---------------- anonymous share links ----------------

    private static async Task<Ok<List<ShareLinkDto>>> ListShareLinksAsync(
        Guid projectId, ClaimsPrincipal principal, IShareLinkService shareLinks, CancellationToken ct)
    {
        return TypedResults.Ok(await shareLinks.ListAsync(projectId, CurrentUserId(principal), ct));
    }

    /// <summary>
    /// Mints a new anonymous read-only link. The raw token is in the response exactly once
    /// and cannot be retrieved later — only its hash is stored.
    /// </summary>
    private static async Task<Ok<CreatedShareLinkDto>> CreateShareLinkAsync(
        Guid projectId, CreateShareLinkRequest request, ClaimsPrincipal principal,
        IShareLinkService shareLinks, CancellationToken ct)
    {
        return TypedResults.Ok(await shareLinks.CreateAsync(projectId, CurrentUserId(principal), request, ct));
    }

    private static async Task<NoContent> RevokeShareLinkAsync(
        Guid projectId, Guid linkId, ClaimsPrincipal principal,
        IShareLinkService shareLinks, CancellationToken ct)
    {
        await shareLinks.RevokeAsync(projectId, linkId, CurrentUserId(principal), ct);
        return TypedResults.NoContent();
    }

    private static async Task<Results<Ok<ProjectMemberDto>, NotFound<ErrorResponse>>> InviteMemberAsync(
        Guid projectId, InviteMemberRequest request, ClaimsPrincipal principal,
        AppDbContext db, UserManager<ApplicationUser> userManager,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Owner, ct);

        var invitee = await userManager.FindByEmailAsync(request.Email);
        if (invitee is null)
        {
            // Generic message: a distinct "no such user" would let any project owner probe
            // which email addresses are registered (OWASP A07 user enumeration).
            return TypedResults.NotFound(new ErrorResponse("Unable to share with the provided details."));
        }

        if (invitee.Id == userId)
            throw new ApiException(422, "invalid_member", "The owner already has full access.");

        var role = Enum.Parse<ProjectRole>(request.Role);
        var existing = await db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == invitee.Id, ct);

        if (existing is not null)
        {
            existing.Role = role;
        }
        else
        {
            db.ProjectMembers.Add(new ProjectMember
            {
                ProjectId = projectId,
                UserId = invitee.Id,
                Role = role,
                CreatedAt = DateTimeOffset.UtcNow,
                InvitedBy = userId
            });
        }

        await db.SaveChangesAsync(ct);

        return TypedResults.Ok(new ProjectMemberDto(
            invitee.Id, invitee.Email!, invitee.DisplayName, role.ToString(), DateTimeOffset.UtcNow));
    }

    private static async Task<NoContent> UpdateMemberRoleAsync(
        Guid projectId, Guid userId, UpdateMemberRoleRequest request, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, CancellationToken ct)
    {
        var callerId = CurrentUserId(principal);
        await access.RequireAsync(projectId, callerId, ProjectRole.Owner, ct);

        var member = await db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, ct)
            ?? throw new ApiException(404, "not_found", "Member not found.");

        member.Role = Enum.Parse<ProjectRole>(request.Role);
        await db.SaveChangesAsync(ct);

        return TypedResults.NoContent();
    }

    /// <summary>The owner may remove anyone; a member may remove themselves (leave).</summary>
    private static async Task<NoContent> RemoveMemberAsync(
        Guid projectId, Guid userId, ClaimsPrincipal principal,
        AppDbContext db, IProjectAccessService access, CancellationToken ct)
    {
        var callerId = CurrentUserId(principal);
        var callerRole = await access.GetRoleAsync(projectId, callerId, ct);

        if (callerRole == ProjectRole.None)
            throw new ApiException(404, "not_found", "Project not found.");

        if (callerRole != ProjectRole.Owner && callerId != userId)
            throw new ApiException(403, "forbidden", "You do not have permission to perform this action.");

        var member = await db.ProjectMembers
            .FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, ct);

        if (member is not null)
        {
            db.ProjectMembers.Remove(member);
            await db.SaveChangesAsync(ct);
        }

        return TypedResults.NoContent();
    }

    private static ProjectRecordDto ToDto(Project p, ProjectRole role) => new(
        p.Id, p.OwnerId, p.Name, p.Color, p.Revision,
        p.CreatedAt, p.UpdatedAt, p.CreatedBy, p.UpdatedBy, p.DeletedAt, role.ToString());
}
