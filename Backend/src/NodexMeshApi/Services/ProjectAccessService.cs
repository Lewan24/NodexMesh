using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;

namespace NodexMeshApi.Services;

public interface IProjectAccessService
{
    Task<ProjectRole> GetRoleAsync(Guid projectId, Guid userId, CancellationToken ct = default);

    /// <summary>Throws 404 (not 403) when the caller has no access at all — see remarks.</summary>
    Task RequireAsync(Guid projectId, Guid userId, ProjectRole minimum, CancellationToken ct = default);

    /// <summary>Resolves a board to its project and enforces the role in one step.</summary>
    Task<Guid> RequireForBoardAsync(Guid boardId, Guid userId, ProjectRole minimum, CancellationToken ct = default);
}

/// <summary>
/// Single choke point for "may this user do this to this project?" (OWASP A01: Broken
/// Access Control). Every endpoint that touches project-scoped data goes through here
/// before reading or writing anything — no endpoint trusts an ID from the request body.
/// </summary>
/// <remarks>
/// Deliberately returns 404 rather than 403 for users with no access at all: a 403 would
/// confirm "this project ID exists", turning the API into an existence oracle. Users who
/// DO have some access but too little for the operation get a real 403 — that's not a
/// leak, since they already know the project exists.
/// </remarks>
public sealed class ProjectAccessService(AppDbContext db) : IProjectAccessService
{
    public async Task<ProjectRole> GetRoleAsync(Guid projectId, Guid userId, CancellationToken ct = default)
    {
        // The global query filter already excludes soft-deleted (trashed) projects.
        var project = await db.Projects
            .AsNoTracking()
            .Where(p => p.Id == projectId)
            .Select(p => new { p.OwnerId })
            .FirstOrDefaultAsync(ct);

        if (project is null) return ProjectRole.None;
        if (project.OwnerId == userId) return ProjectRole.Owner;

        var member = await db.ProjectMembers
            .AsNoTracking()
            .Where(m => m.ProjectId == projectId && m.UserId == userId)
            .Select(m => (ProjectRole?)m.Role)
            .FirstOrDefaultAsync(ct);

        return member ?? ProjectRole.None;
    }

    public async Task RequireAsync(Guid projectId, Guid userId, ProjectRole minimum, CancellationToken ct = default)
    {
        var role = await GetRoleAsync(projectId, userId, ct);

        if (role == ProjectRole.None)
            throw new ApiException(404, "not_found", "Project not found.");

        if (role < minimum)
            throw new ApiException(403, "forbidden", "You do not have permission to perform this action.");
    }

    public async Task<Guid> RequireForBoardAsync(Guid boardId, Guid userId, ProjectRole minimum, CancellationToken ct = default)
    {
        var projectId = await db.Boards
            .AsNoTracking()
            .Where(b => b.Id == boardId)
            .Select(b => b.ProjectId)
            .FirstOrDefaultAsync(ct);

        if (projectId == Guid.Empty)
            throw new ApiException(404, "not_found", "Board not found.");

        await RequireAsync(projectId, userId, minimum, ct);
        return projectId;
    }
}
