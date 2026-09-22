using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public static class ProjectDeletionService
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(30);

    // SaveChanges commits these removals atomically with the project deletion.
    public static async Task RemoveAsync(AppDbContext db, Project project, CancellationToken ct)
    {
        var boardIds = db.Boards.IgnoreQueryFilters().Where(b => b.ProjectId == project.Id).Select(b => b.Id);
        var itemIds = db.BoardItems.IgnoreQueryFilters().Where(i => boardIds.Contains(i.BoardId)).Select(i => i.Id);
        db.ItemLinks.RemoveRange(await db.ItemLinks
            .Where(link => itemIds.Contains(link.SourceItemId) || itemIds.Contains(link.TargetItemId)).ToListAsync(ct));
        db.ProjectAppearanceOverrides.RemoveRange(await db.ProjectAppearanceOverrides
            .Where(value => value.ProjectId == project.Id).ToListAsync(ct));
        var projectId = project.Id.ToString();
        db.UserClaims.RemoveRange(await db.UserClaims
            .Where(claim => claim.ClaimType == "default_project" && claim.ClaimValue == projectId).ToListAsync(ct));
        db.Projects.Remove(project);
    }

    public static async Task<int> CleanExpiredAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct = default)
    {
        var cutoff = now - Retention;
        var projects = await db.Projects.IgnoreQueryFilters()
            .Where(p => p.UserDeletedAt != null && p.UserDeletedAt <= cutoff)
            .OrderBy(p => p.UserDeletedAt).Take(100).ToListAsync(ct);
        foreach (var project in projects) await RemoveAsync(db, project, ct);
        await db.SaveChangesAsync(ct);
        return projects.Count;
    }
}
