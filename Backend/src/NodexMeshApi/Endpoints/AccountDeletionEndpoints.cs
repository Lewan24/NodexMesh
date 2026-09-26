using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public sealed record AccountProjectDecision(Guid ProjectId, string Action, Guid? NewOwnerId);
public sealed record DeleteAccountRequest([property: Required] string CurrentPassword,
    [property: Required] List<AccountProjectDecision> Projects);

public static class AccountDeletionEndpoints
{
    public static void MapAccountDeletionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth/account-deletion").RequireAuthorization().WithTags("Auth");
        group.MapGet("", async (ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            var id = principal.GetUserId();
            var projects = await db.Projects.IgnoreQueryFilters().AsNoTracking().Where(p => p.OwnerId == id)
                .OrderBy(p => p.Name).Select(p => new
                {
                    p.Id, p.Name,
                    Collaborators = (from member in db.ProjectMembers
                                     join user in db.Users on member.UserId equals user.Id
                                     where member.ProjectId == p.Id && user.Id != id && !user.IsBlocked && user.DeletionRequestedAt == null
                                     select new { user.Id, user.DisplayName, user.Email }).ToList()
                }).ToListAsync(ct);
            return Results.Ok(new { retentionDays = 90, projects });
        });
        group.MapPost("", DeleteAsync).RequireRateLimiting("auth-strict");
        var admin = app.MapGroup("/api/v1/admin/users").RequireAuthorization("AdminOnly").WithTags("Administration");
        admin.MapPost("/{userId:guid}/restore", async (
            Guid userId,
            AppDbContext db,
            IEmailQueue emailQueue,
            CancellationToken ct) =>
        {
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
                var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct)
                    ?? throw new ApiException(404, "not_found", "User not found.");
                if (user.DeletionRequestedAt is null)
                    throw new ApiException(409, "not_pending_deletion", "This account is not pending deletion.");
                user.DeletionRequestedAt = null;
                user.IsBlocked = false;
                await emailQueue.QueueTemplateAsync(db, "account.restored", user.Email!,
                    new Dictionary<string, string> { ["display_name"] = user.DisplayName }, ct);
                await db.SaveChangesAsync(ct);
                await transaction.CommitAsync(ct);
            });
            return Results.NoContent();
        });
        admin.MapDelete("/{userId:guid}/permanent", async (Guid userId, ClaimsPrincipal principal, AppDbContext db, CancellationToken ct) =>
        {
            if (userId == principal.GetUserId())
                throw new ApiException(409, "self_removal", "You cannot permanently delete the active administrator.");
            await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
            {
                db.ChangeTracker.Clear();
                await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
                var user = await db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct)
                    ?? throw new ApiException(404, "not_found", "User not found.");
                await AccountDeletionService.RemoveAsync(db, user, ct);
                await transaction.CommitAsync(ct);
            });
            return Results.NoContent();
        });
    }

    private static async Task<IResult> DeleteAsync(DeleteAccountRequest request, ClaimsPrincipal principal,
        UserManager<ApplicationUser> users, AppDbContext db, IEmailQueue emailQueue, HttpContext http, CancellationToken ct)
    {
        await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await DeleteOnceAsync(request, principal.GetUserId(), users, db, emailQueue, ct);
        });
        http.Response.Cookies.Delete("nodexmesh_refresh_token", new CookieOptions { Path = "/api/v1/auth" });
        return Results.NoContent();
    }

    private static async Task DeleteOnceAsync(DeleteAccountRequest request, Guid id,
        UserManager<ApplicationUser> users, AppDbContext db, IEmailQueue emailQueue, CancellationToken ct)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        var user = await db.Users.SingleAsync(u => u.Id == id, ct);
        if (!await users.CheckPasswordAsync(user, request.CurrentPassword))
            throw new ApiException(400, "invalid_credentials", "The current password is incorrect.");
        if (user.IsAdmin && await db.Users.CountAsync(u => u.IsAdmin && !u.IsBlocked, ct) <= 1)
            throw new ApiException(409, "last_admin", "The last active administrator cannot delete their account.");
        var projects = await db.Projects.IgnoreQueryFilters().Include(p => p.Members).Where(p => p.OwnerId == id).ToListAsync(ct);
        if (request.Projects is null || request.Projects.Count != projects.Count ||
            request.Projects.Select(p => p.ProjectId).Distinct().Count() != projects.Count ||
            request.Projects.Any(d => projects.All(p => p.Id != d.ProjectId)))
            throw new ApiException(409, "projects_changed", "Choose an action for every owned project. Reload the list if projects changed.");
        var now = DateTimeOffset.UtcNow;
        foreach (var project in projects)
        {
            var decision = request.Projects.Single(d => d.ProjectId == project.Id);
            if (decision.Action == "delete" && decision.NewOwnerId is null)
                await ProjectDeletionService.RemoveAsync(db, project, ct);
            else if (decision.Action == "transfer" && decision.NewOwnerId is Guid nextId && nextId != id &&
                project.Members.Any(m => m.UserId == nextId) &&
                await db.Users.AnyAsync(u => u.Id == nextId && !u.IsBlocked && u.DeletionRequestedAt == null, ct))
            {
                var nextOwner = await db.Users.SingleAsync(u => u.Id == nextId, ct);
                db.ProjectMembers.Remove(project.Members.Single(m => m.UserId == nextId));
                project.OwnerId = nextId;
                project.Revision++;
                project.UpdatedAt = now;
                project.UpdatedBy = id;
                await emailQueue.QueueUserTemplateAsync(db, "project.owner-changed", nextOwner.Email!,
                    new Dictionary<string, string>
                    {
                        ["display_name"] = nextOwner.DisplayName,
                        ["project_name"] = project.Name,
                        ["message"] = $"You are now the owner of the project '{project.Name}'."
                    }, ct);
            }
            else throw new ApiException(409, "invalid_project_decision", "Select delete or transfer to an active collaborator for every project.");
        }
        db.ProjectMembers.RemoveRange(await db.ProjectMembers.Where(m => m.UserId == id).ToListAsync(ct));
        db.ProjectAppearanceOverrides.RemoveRange(await db.ProjectAppearanceOverrides.Where(p => p.UserId == id).ToListAsync(ct));
        db.UserClaims.RemoveRange(await db.UserClaims.Where(c => c.UserId == id && c.ClaimType == "default_project").ToListAsync(ct));
        foreach (var token in await db.RefreshTokens.Where(t => t.UserId == id && t.RevokedAtUtc == null).ToListAsync(ct))
            token.RevokedAtUtc = now.UtcDateTime;
        user.IsBlocked = true;
        user.DeletionRequestedAt = now;
        user.SecurityStamp = Guid.NewGuid().ToString();
        await emailQueue.QueueTemplateAsync(db, "account.deletion-requested", user.Email!,
            new Dictionary<string, string>
            {
                ["display_name"] = user.DisplayName,
                ["retention_days"] = ((int)AccountDeletionService.Retention.TotalDays).ToString()
            }, ct);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
