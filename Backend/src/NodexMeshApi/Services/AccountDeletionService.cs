using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;

namespace NodexMeshApi.Services;

public static class AccountDeletionService
{
    public static readonly TimeSpan Retention = TimeSpan.FromDays(90);

    // All project decisions have already been applied before an account enters retention.
    public static async Task RemoveAsync(AppDbContext db, ApplicationUser user, CancellationToken ct)
    {
        if (!user.IsBlocked)
            throw new ApiException(409, "account_active", "Block the account before permanently deleting it.");
        if (await db.Projects.IgnoreQueryFilters().AnyAsync(p => p.OwnerId == user.Id, ct))
            throw new ApiException(409, "account_owns_projects", "Resolve project ownership before permanently deleting this account.");
        db.ProjectMembers.RemoveRange(await db.ProjectMembers.Where(m => m.UserId == user.Id).ToListAsync(ct));
        db.RefreshTokens.RemoveRange(await db.RefreshTokens.Where(t => t.UserId == user.Id).ToListAsync(ct));
        db.AppearanceProfiles.RemoveRange(await db.AppearanceProfiles.Where(p => p.UserId == user.Id).ToListAsync(ct));
        db.ProjectAppearanceOverrides.RemoveRange(await db.ProjectAppearanceOverrides.Where(p => p.UserId == user.Id).ToListAsync(ct));
        db.IdempotencyKeys.RemoveRange(await db.IdempotencyKeys.Where(k => k.UserId == user.Id).ToListAsync(ct));
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);
    }

    public static Task<int> CleanExpiredAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct = default) =>
        db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            // A rolled-back attempt may already have accepted tracked entity changes.
            // Reload the complete batch on every attempt instead of reusing those entities.
            db.ChangeTracker.Clear();
            return await CleanExpiredOnceAsync(db, now, ct);
        });

    private static async Task<int> CleanExpiredOnceAsync(AppDbContext db, DateTimeOffset now, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var cutoff = now - Retention;
        var users = await db.Users.Where(u => u.IsBlocked && u.DeletionRequestedAt <= cutoff)
            .OrderBy(u => u.DeletionRequestedAt).Take(100).ToListAsync(ct);
        foreach (var user in users) await RemoveAsync(db, user, ct);
        await transaction.CommitAsync(ct);
        return users.Count;
    }
}
