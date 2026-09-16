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

        group.MapGet("/{projectId:guid}/members", ListMembersAsync);
        group.MapPost("/{projectId:guid}/members", InviteMemberAsync);
        group.MapPatch("/{projectId:guid}/members/{userId:guid}", UpdateMemberRoleAsync);
        group.MapDelete("/{projectId:guid}/members/{userId:guid}", RemoveMemberAsync);
    }

    private static Guid CurrentUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    /// <summary>Projects the user owns *or* has been invited to.</summary>
    private static async Task<Ok<List<ProjectRecordDto>>> ListAsync(
        ClaimsPrincipal principal, AppDbContext db, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);

        var owned = await db.Projects.AsNoTracking()
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

    // ---------------- sharing ----------------

    private static async Task<Ok<List<ProjectMemberDto>>> ListMembersAsync(
        Guid projectId, ClaimsPrincipal principal, AppDbContext db,
        IProjectAccessService access, CancellationToken ct)
    {
        var userId = CurrentUserId(principal);
        await access.RequireAsync(projectId, userId, ProjectRole.Viewer, ct);

        var members = await db.ProjectMembers.AsNoTracking()
            .Where(m => m.ProjectId == projectId)
            .Join(db.Users, m => m.UserId, u => u.Id, (m, u) => new ProjectMemberDto(
                u.Id, u.Email!, u.DisplayName, m.Role.ToString(), m.CreatedAt))
            .ToListAsync(ct);

        return TypedResults.Ok(members);
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
