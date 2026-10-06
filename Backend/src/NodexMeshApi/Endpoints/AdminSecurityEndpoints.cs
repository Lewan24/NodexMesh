using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Auditing;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;

namespace NodexMeshApi.Endpoints;

public sealed record AdminMfaResetStart([property: Required, MaxLength(256)] string CurrentPassword);
public sealed record AdminMfaResetRequest(
    [property: Required, MaxLength(256)] string CurrentPassword,
    [property: Required, MinLength(5), MaxLength(500)] string Reason,
    [property: MaxLength(128)] string? ChallengeToken = null,
    [property: MaxLength(64)] string? Code = null);
public sealed record BanIpRequest(
    [property: Required, MaxLength(45)] string Ip,
    [property: Required, MinLength(5), MaxLength(500)] string Reason,
    [property: Range(1, 43200)] int DurationMinutes = 60);
public sealed record ReleaseIpRequest([property: Required, MinLength(5), MaxLength(500)] string Reason);

public static class AdminSecurityEndpoints
{
    public static void MapAdminSecurityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/admin").RequireAuthorization("AdminOnly").WithTags("Administration security");
        group.MapPost("/users/{userId:guid}/mfa/reset/start", StartResetAsync).RequireRateLimiting("auth-strict");
        group.MapPost("/users/{userId:guid}/mfa/reset", ResetAsync).RequireRateLimiting("auth-strict");
        group.MapGet("/security/ips", ListIpsAsync);
        group.MapPost("/security/ips", BanAsync).RequireRateLimiting("auth-strict");
        group.MapPost("/security/ips/{ip}/release", ReleaseAsync).RequireRateLimiting("auth-strict");
    }

    private static async Task<ApplicationUser> VerifyAdminAsync(HttpContext http, string password,
        UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, CancellationToken ct)
    {
        var admin = await users.FindByIdAsync(http.User.GetUserId().ToString())
            ?? throw new ApiException(401, "unauthorized", "Authentication required.");
        if (!admin.IsAdmin || admin.IsBlocked || admin.DeletionRequestedAt is not null)
            throw new ApiException(403, "forbidden", "Administrator access required.");
        if (!(await signIn.CheckPasswordSignInAsync(admin, password, lockoutOnFailure: true)).Succeeded)
            throw new ApiException(401, "invalid_credentials", "Administrator password verification failed.");
        return admin;
    }

    private static async Task<IResult> StartResetAsync(Guid userId, AdminMfaResetStart request, HttpContext http,
        UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, MfaService mfa, CancellationToken ct)
    {
        if (userId == http.User.GetUserId()) throw new ApiException(409, "self_mfa_reset", "Use your account MFA settings.");
        if (!await users.Users.AnyAsync(x => x.Id == userId, ct)) throw new ApiException(404, "not_found", "User not found.");
        var admin = await VerifyAdminAsync(http, request.CurrentPassword, users, signIn, ct);
        if (!admin.TwoFactorEnabled) return Results.Ok(new { mfaRequired = false });
        return Results.Ok(await mfa.StartAsync(admin, "admin-reset:" + userId, ct: ct));
    }

    private static async Task<IResult> ResetAsync(Guid userId, AdminMfaResetRequest request, HttpContext http,
        UserManager<ApplicationUser> users, SignInManager<ApplicationUser> signIn, MfaService mfa,
        AppDbContext db, IEmailQueue email, CancellationToken ct)
    {
        if (userId == http.User.GetUserId()) throw new ApiException(409, "self_mfa_reset", "Use your account MFA settings.");
        var admin = await VerifyAdminAsync(http, request.CurrentPassword, users, signIn, ct);
        if (admin.TwoFactorEnabled)
            await mfa.VerifyAsync(new MfaCompleteRequest(request.ChallengeToken ?? "", request.Code ?? ""),
                "admin-reset:" + userId, admin.Id, ct);
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var user = await db.Users.SingleOrDefaultAsync(x => x.Id == userId, ct)
                ?? throw new ApiException(404, "not_found", "User not found.");
            user.TwoFactorEnabled = false;
            user.MfaPreferredMethod = "email";
            user.MfaSecretProtected = null;
            user.MfaLastAcceptedStep = null;
            user.SecurityStamp = Guid.NewGuid().ToString();
            user.ConcurrencyStamp = Guid.NewGuid().ToString();
            user.AccessFailedCount = 0;
            user.LockoutEnd = null;
            db.MfaChallenges.RemoveRange(await db.MfaChallenges.Where(x => x.UserId == userId).ToListAsync(ct));
            db.MfaRecoveryCodes.RemoveRange(await db.MfaRecoveryCodes.Where(x => x.UserId == userId).ToListAsync(ct));
            foreach (var token in await db.RefreshTokens.Where(x => x.UserId == userId && x.RevokedAtUtc == null).ToListAsync(ct))
                token.RevokedAtUtc = DateTime.UtcNow;
            var audit = AuditCapture.Create(http, "admin.mfa_reset", target: userId);
            audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new { reason = AuditCapture.Clean(request.Reason, 500) });
            db.AuditEvents.Add(audit);
            await email.QueueTemplateAsync(db, "account.mfa-reset", user.Email!,
                new Dictionary<string, string> { ["display_name"] = user.DisplayName }, ct);
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return Results.NoContent();
        });
    }

    private static async Task<IResult> ListIpsAsync(string? status, string? search, int? page,
        AppDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var query = db.IpAccessStates.AsNoTracking();
        if (status == "banned") query = query.Where(x => x.BannedUntil > now);
        if (status == "suspicious") query = query.Where(x => x.BannedUntil == null || x.BannedUntil <= now);
        if (!string.IsNullOrWhiteSpace(search)) query = query.Where(x => x.Ip.Contains(search.Trim()));
        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.BannedUntil > now).ThenByDescending(x => x.LastSeen)
            .Skip((Math.Clamp(page ?? 1, 1, 100000) - 1) * 50).Take(50).ToListAsync(ct);
        return Results.Ok(new { items, total });
    }

    private static async Task<IResult> BanAsync(BanIpRequest request, HttpContext http,
        AppDbContext db, IpProtectionService protection, IpConnectionRegistry connections,
        Microsoft.Extensions.Options.IOptions<IpProtectionOptions> options, CancellationToken ct)
    {
        var input = request.Ip.Trim();
        if (input.Contains('%') || !System.Net.IPAddress.TryParse(input, out var address)
            || (address.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork && input != address.ToString()))
            throw new ApiException(422, "invalid_ip", "Enter a complete IPv4 or IPv6 address without a port or CIDR prefix.");
        var ip = IpProtectionService.Normalize(input);
        if (!options.Value.Enabled)
            throw new ApiException(409, "ip_protection_disabled", "Enable IP protection before adding bans.");
        if (protection.IsExempt(ip))
            throw new ApiException(409, "ip_allowlisted", "This IP is allowlisted in deployment settings.");
        if (ip == ClientIpResolver.Resolve(http))
            throw new ApiException(409, "self_ip_ban", "You cannot ban your current IP address.");
        var now = DateTime.UtcNow;
        var state = await db.IpAccessStates.SingleOrDefaultAsync(x => x.Ip == ip, ct);
        var created = state is null;
        if (state is null)
        {
            state = new IpAccessState { Ip = ip, WindowStart = now, LastSeen = now };
            db.IpAccessStates.Add(state);
        }
        if (state.BannedUntil > now)
            throw new ApiException(409, "ip_already_banned", "This IP is already banned. Release it before adding a new ban.");
        state.BannedUntil = now.AddMinutes(request.DurationMinutes);
        state.Reason = "manual_admin";
        state.Version = Guid.NewGuid();
        var audit = AuditCapture.Create(http, "admin.ip_banned");
        audit.ResourceType = "IpAccessState";
        audit.ResourceId = ip;
        audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new
        {
            reason = AuditCapture.Clean(request.Reason.Trim(), 500), state.BannedUntil, request.DurationMinutes
        });
        db.AuditEvents.Add(audit);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException)
        {
            throw new ApiException(409, "concurrent_update", "The IP record changed. Refresh and retry.");
        }
        catch (DbUpdateException) when (created)
        {
            db.Entry(state).State = EntityState.Detached;
            db.Entry(audit).State = EntityState.Detached;
            if (await db.IpAccessStates.AnyAsync(x => x.Ip == ip, ct))
                throw new ApiException(409, "concurrent_update", "The IP record changed. Refresh and retry.");
            throw;
        }
        connections.Abort(ip);
        return Results.NoContent();
    }

    private static async Task<IResult> ReleaseAsync(string ip, ReleaseIpRequest request, HttpContext http,
        AppDbContext db, CancellationToken ct)
    {
        if (!System.Net.IPAddress.TryParse(ip, out _)) throw new ApiException(422, "invalid_ip", "Invalid IP address.");
        ip = IpProtectionService.Normalize(ip);
        var state = await db.IpAccessStates.SingleOrDefaultAsync(x => x.Ip == ip, ct)
            ?? throw new ApiException(404, "not_found", "IP record not found.");
        state.BannedUntil = null;
        state.Reason = null;
        state.ReleasedAt = state.WindowStart = DateTime.UtcNow;
        state.ReleasedBy = http.User.GetUserId();
        state.FailedLogins = state.Unauthorized = state.NotFound = state.RateLimited = 0;
        state.Version = Guid.NewGuid();
        var audit = AuditCapture.Create(http, "admin.ip_released");
        audit.ResourceType = "IpAccessState";
        audit.ResourceId = ip;
        audit.Metadata = System.Text.Json.JsonSerializer.Serialize(new { reason = AuditCapture.Clean(request.Reason, 500) });
        db.AuditEvents.Add(audit);
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new ApiException(409, "concurrent_update", "The IP record changed. Refresh and retry."); }
        return Results.NoContent();
    }
}
