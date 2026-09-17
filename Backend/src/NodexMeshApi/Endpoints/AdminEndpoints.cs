using System.Security.Claims;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;

namespace NodexMeshApi.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin")
            .WithTags("Administration")
            .RequireAuthorization("AdminOnly");

        group.MapGet("/users", ListUsersAsync);
        group.MapPost("/users", CreateUserAsync);
        group.MapPost("/users/{userId:guid}/password", ResetPasswordAsync);
        group.MapPatch("/users/{userId:guid}/blocked", SetBlockedAsync);
        group.MapGet("/projects", ListProjectsAsync);
        group.MapPost("/projects/{projectId:guid}/members", AddMemberAsync);
        group.MapDelete("/projects/{projectId:guid}/members/{userId:guid}", RemoveMemberAsync);
        group.MapGet("/settings/registration", GetRegistrationAsync);
        group.MapPut("/settings/registration", SetRegistrationAsync);
    }

    private static async Task<Ok<List<AdminUserDto>>> ListUsersAsync(UserManager<ApplicationUser> users, CancellationToken ct)
    {
        var rows = await users.Users.AsNoTracking().OrderBy(u => u.Email).ToListAsync(ct);
        return TypedResults.Ok(rows.Select(ToUser).ToList());
    }

    private static async Task<Results<Ok<AdminUserDto>, Conflict<ErrorResponse>, ValidationProblem>> CreateUserAsync(
        AdminCreateUserRequest request, UserManager<ApplicationUser> users, AppDbContext db, CancellationToken ct)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        if (await users.FindByEmailAsync(email) is not null)
            return TypedResults.Conflict(new ErrorResponse("A user with that email already exists."));

        var user = new ApplicationUser
        {
            Id = Guid.CreateVersion7(), UserName = email,
            Email = email, DisplayName = request.DisplayName.Trim(),
            IsAdmin = request.IsAdmin
        };
        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return TypedResults.ValidationProblem(result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));
        db.AppearanceProfiles.Add(new AppearanceProfile
        {
            UserId = user.Id,
            LightTheme = DefaultThemes.Light,
            DarkTheme = DefaultThemes.Dark,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(ToUser(user));
    }

    private static async Task<NoContent> ResetPasswordAsync(
        Guid userId, AdminResetPasswordRequest request, UserManager<ApplicationUser> users, AppDbContext db, CancellationToken ct)
    {
        var user = await users.FindByIdAsync(userId.ToString()) ?? throw new ApiException(404, "not_found", "User not found.");
        var token = await users.GeneratePasswordResetTokenAsync(user);
        var result = await users.ResetPasswordAsync(user, token, request.Password);
        if (!result.Succeeded)
            throw new ApiException(422, "invalid_password", string.Join(" ", result.Errors.Select(e => e.Description)));
        await RevokeSessionsAsync(db, userId, ct);
        return TypedResults.NoContent();
    }

    private static async Task<NoContent> SetBlockedAsync(
        Guid userId, AdminBlockUserRequest request, ClaimsPrincipal principal, UserManager<ApplicationUser> users,
        AppDbContext db,
        CancellationToken ct)
    {
        var callerId = principal.GetUserId();
        if (callerId == userId && request.Blocked)
            throw new ApiException(409, "self_block", "You cannot block the active administrator.");
        var user = await users.FindByIdAsync(userId.ToString()) ?? throw new ApiException(404, "not_found", "User not found.");
        if (request.Blocked && user.IsAdmin && await users.Users.CountAsync(candidate => candidate.IsAdmin && !candidate.IsBlocked, ct) <= 1)
            throw new ApiException(409, "last_admin", "The last active administrator cannot be blocked.");
        user.IsBlocked = request.Blocked;
        await users.UpdateAsync(user);
        if (request.Blocked) await RevokeSessionsAsync(db, userId, ct);
        return TypedResults.NoContent();
    }

    private static async Task<Ok<List<AdminProjectDto>>> ListProjectsAsync(AppDbContext db, CancellationToken ct)
    {
        var projects = await db.Projects.IgnoreQueryFilters().AsNoTracking().Include(p => p.Members).OrderBy(p => p.Name).ToListAsync(ct);
        var users = await db.Users.AsNoTracking().ToDictionaryAsync(u => u.Id, ct);
        var result = projects.Select(project => new AdminProjectDto(
            project.Id, project.Name, project.OwnerId, users.GetValueOrDefault(project.OwnerId)?.Email ?? "unknown",
            project.CreatedAt, project.UpdatedAt, project.DeletedAt,
            project.Members.Select(member => new AdminProjectMemberDto(
                member.UserId, users.GetValueOrDefault(member.UserId)?.Email ?? "unknown",
                users.GetValueOrDefault(member.UserId)?.DisplayName ?? "Unknown", member.Role.ToString())).ToList())).ToList();
        return TypedResults.Ok(result);
    }

    private static async Task<Results<Ok<AdminProjectMemberDto>, Conflict<ErrorResponse>, NotFound<ErrorResponse>>> AddMemberAsync(
        Guid projectId, AdminAddProjectMemberRequest request, AppDbContext db, CancellationToken ct)
    {
        var project = await db.Projects.IgnoreQueryFilters().FirstOrDefaultAsync(p => p.Id == projectId, ct);
        if (project is null) return TypedResults.NotFound(new ErrorResponse("Project not found."));
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == request.Email.Trim(), ct);
        if (user is null) return TypedResults.NotFound(new ErrorResponse("User not found."));
        if (user.IsBlocked) return TypedResults.Conflict(new ErrorResponse("Blocked users cannot be added to projects."));
        if (user.Id == project.OwnerId) return TypedResults.Conflict(new ErrorResponse("The owner is already assigned to this project."));
        if (await db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == user.Id, ct))
            return TypedResults.Conflict(new ErrorResponse("That user is already a member."));
        var role = Enum.Parse<ProjectRole>(request.Role);
        db.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = user.Id, Role = role, CreatedAt = DateTimeOffset.UtcNow, InvitedBy = project.OwnerId });
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok(new AdminProjectMemberDto(user.Id, user.Email!, user.DisplayName, role.ToString()));
    }

    private static async Task<NoContent> RemoveMemberAsync(Guid projectId, Guid userId, AppDbContext db, CancellationToken ct)
    {
        var member = await db.ProjectMembers.FirstOrDefaultAsync(m => m.ProjectId == projectId && m.UserId == userId, ct)
            ?? throw new ApiException(404, "not_found", "Project member not found.");
        db.ProjectMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        return TypedResults.NoContent();
    }

    private static async Task<Ok<object>> GetRegistrationAsync(AppDbContext db, CancellationToken ct)
    {
        var settings = await EnsureSettingsAsync(db, ct);
        return TypedResults.Ok<object>(new { enabled = settings.RegistrationEnabled });
    }

    private static async Task<Ok<object>> SetRegistrationAsync(AdminRegistrationRequest request, AppDbContext db, CancellationToken ct)
    {
        var settings = await EnsureSettingsAsync(db, ct);
        settings.RegistrationEnabled = request.Enabled;
        settings.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return TypedResults.Ok<object>(new { enabled = settings.RegistrationEnabled });
    }

    private static async Task<SystemSettings> EnsureSettingsAsync(AppDbContext db, CancellationToken ct)
    {
        var settings = await db.SystemSettings.SingleOrDefaultAsync(ct);
        if (settings is not null) return settings;
        settings = new SystemSettings { Id = 1, RegistrationEnabled = true };
        db.SystemSettings.Add(settings);
        await db.SaveChangesAsync(ct);
        return settings;
    }

    private static AdminUserDto ToUser(ApplicationUser user) => new(user.Id, user.Email!, user.DisplayName, user.IsAdmin, user.IsBlocked, user.CreatedAt);

    private static async Task RevokeSessionsAsync(AppDbContext db, Guid userId, CancellationToken ct)
    {
        var tokens = await db.RefreshTokens.Where(token => token.UserId == userId && token.RevokedAtUtc == null).ToListAsync(ct);
        var now = DateTime.UtcNow;
        foreach (var token in tokens) token.RevokedAtUtc = now;
        if (tokens.Count > 0) await db.SaveChangesAsync(ct);
    }
}
