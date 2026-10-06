using System.Net;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Data;

namespace NodexMeshApi.Auditing;

public sealed class IpAccessState
{
    public string Ip { get; set; } = "";
    public DateTime WindowStart { get; set; }
    public DateTime LastSeen { get; set; }
    public int FailedLogins { get; set; }
    public int Unauthorized { get; set; }
    public int NotFound { get; set; }
    public int RateLimited { get; set; }
    public DateTime? BannedUntil { get; set; }
    public string? Reason { get; set; }
    public DateTime? ReleasedAt { get; set; }
    public Guid? ReleasedBy { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}

public sealed class IpProtectionOptions
{
    public bool Enabled { get; set; } = true;
    public int WindowMinutes { get; set; } = 10;
    public int BanMinutes { get; set; } = 60;
    public int FailedLoginThreshold { get; set; } = 10;
    public int UnauthorizedThreshold { get; set; } = 30;
    public int NotFoundThreshold { get; set; } = 40;
    public int RateLimitThreshold { get; set; } = 20;
    public string[] Allowlist { get; set; } = [];
}

public sealed class IpProtectionService(AppDbContext db, IOptions<IpProtectionOptions> options, IpConnectionRegistry? connections = null)
{
    public static string Normalize(string ip)
    {
        var address = IPAddress.Parse(ip);
        return (address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address).ToString();
    }

    public bool IsExempt(string ip) => options.Value.Allowlist.Any(entry => Normalize(entry) == ip);

    public async Task<bool> IsBannedAsync(string? ip, CancellationToken ct)
    {
        if (!options.Value.Enabled || ip is null || IsExempt(ip)) return false;
        var now = DateTime.UtcNow;
        return await db.IpAccessStates.AsNoTracking().AnyAsync(x => x.Ip == ip && x.BannedUntil > now, ct);
    }

    // Only explicit failures count; successful requests and blocked traffic never extend a ban.
    // Optimistic concurrency gives each committed failure exactly one increment across API replicas.
    public async Task RecordAsync(AuditEvent audit, CancellationToken ct)
    {
        var kind = audit.EventType switch
        {
            "auth.login_failed" or "auth.login_locked" or "auth.mfa_failed" => 1,
            "http.unauthenticated" or "http.forbidden" => 2,
            "http.unmatched" or "http.not_found" => 3,
            "http.rate_limited" => 4,
            _ => 0
        };
        var ip = audit.ClientIp is null ? null : Normalize(audit.ClientIp);
        var settings = options.Value;
        if (kind == 0 || !settings.Enabled || ip is null || IsExempt(ip)) return;
        for (var attempt = 0; attempt < 32; attempt++)
        {
            var state = await db.IpAccessStates.SingleOrDefaultAsync(x => x.Ip == ip, ct);
            if (state is null)
            {
                state = new IpAccessState { Ip = ip, WindowStart = audit.OccurredAt };
                db.IpAccessStates.Add(state);
            }
            // Ignore delayed events from before an administrator released the ban.
            if (state.ReleasedAt >= audit.OccurredAt || state.BannedUntil > DateTime.UtcNow) return;
            if (state.WindowStart <= audit.OccurredAt.AddMinutes(-settings.WindowMinutes)
                || (state.BannedUntil is not null && state.BannedUntil <= DateTime.UtcNow))
            {
                state.WindowStart = audit.OccurredAt;
                state.FailedLogins = state.Unauthorized = state.NotFound = state.RateLimited = 0;
                state.BannedUntil = null;
                state.Reason = null;
            }
            state.LastSeen = audit.OccurredAt;
            if (kind == 1) state.FailedLogins++;
            if (kind == 2) state.Unauthorized++;
            if (kind == 3) state.NotFound++;
            if (kind == 4) state.RateLimited++;
            var reason = state.FailedLogins >= settings.FailedLoginThreshold ? "failed_logins"
                : state.Unauthorized >= settings.UnauthorizedThreshold ? "unauthorized_requests"
                : state.NotFound >= settings.NotFoundThreshold ? "not_found_requests"
                : state.RateLimited >= settings.RateLimitThreshold ? "rate_limited_requests" : null;
            if (reason is not null)
            {
                state.BannedUntil = DateTime.UtcNow.AddMinutes(settings.BanMinutes);
                state.Reason = reason;
            }
            state.Version = Guid.NewGuid();
            AuditEvent? banAudit = reason is null ? null : new AuditEvent
            {
                EventType = "security.ip_banned", ClientIp = ip, Severity = "Warning",
                Metadata = System.Text.Json.JsonSerializer.Serialize(new { reason, state.BannedUntil })
            };
            if (banAudit is not null) db.AuditEvents.Add(banAudit);
            try
            {
                await db.SaveChangesAsync(ct);
                if (reason is not null) connections?.Abort(ip);
                return;
            }
            catch (DbUpdateConcurrencyException) when (attempt < 31)
            {
                db.Entry(state).State = EntityState.Detached;
                if (banAudit is not null) db.Entry(banAudit).State = EntityState.Detached;
                await Task.Delay(Random.Shared.Next(5, 25), ct);
            }
            catch (DbUpdateException) when (attempt < 31 && db.Entry(state).State == EntityState.Added)
            {
                db.Entry(state).State = EntityState.Detached;
                if (banAudit is not null) db.Entry(banAudit).State = EntityState.Detached;
                if (!await db.IpAccessStates.AnyAsync(x => x.Ip == ip, ct)) throw;
                await Task.Delay(Random.Shared.Next(5, 25), ct);
            }
        }
    }
}

public sealed class IpProtectionMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, IpProtectionService protection)
    {
        if (await protection.IsBannedAsync(ClientIpResolver.Resolve(http), http.RequestAborted))
        {
            http.Response.StatusCode = StatusCodes.Status403Forbidden;
            http.Response.Headers.CacheControl = "no-store";
            await http.Response.WriteAsJsonAsync(new { code = "ip_banned", message = "Access denied." }, http.RequestAborted);
            return;
        }
        await next(http);
    }
}

public sealed class IpProtectionHubFilter(IServiceScopeFactory scopes, IpConnectionRegistry connections) : Microsoft.AspNetCore.SignalR.IHubFilter
{
    public async Task OnConnectedAsync(HubLifetimeContext context, Func<HubLifetimeContext, Task> next)
    {
        var ip = ClientIpResolver.Resolve(context.Context.GetHttpContext());
        await using var scope = scopes.CreateAsyncScope();
        if (await scope.ServiceProvider.GetRequiredService<IpProtectionService>().IsBannedAsync(ip, context.Context.ConnectionAborted))
        {
            context.Context.Abort();
            return;
        }
        connections.Add(context.Context, ip);
        try { await next(context); }
        catch { connections.Remove(context.Context.ConnectionId); throw; }
    }

    public async Task OnDisconnectedAsync(HubLifetimeContext context, Exception? exception,
        Func<HubLifetimeContext, Exception?, Task> next)
    {
        connections.Remove(context.Context.ConnectionId);
        await next(context, exception);
    }

    public async ValueTask<object?> InvokeMethodAsync(Microsoft.AspNetCore.SignalR.HubInvocationContext context,
        Func<Microsoft.AspNetCore.SignalR.HubInvocationContext, ValueTask<object?>> next)
    {
        await using var scope = scopes.CreateAsyncScope();
        var protection = scope.ServiceProvider.GetRequiredService<IpProtectionService>();
        if (await protection.IsBannedAsync(ClientIpResolver.Resolve(context.Context.GetHttpContext()), context.Context.ConnectionAborted))
        {
            context.Context.Abort();
            throw new Microsoft.AspNetCore.SignalR.HubException("Access denied.");
        }
        return await next(context);
    }
}

// Live sockets are process-local; the monitor propagates persisted bans to other replicas.
public sealed class IpConnectionRegistry
{
    private readonly System.Collections.Concurrent.ConcurrentDictionary<string, (HubCallerContext Context, string Ip)> connections = new();
    public void Add(HubCallerContext context, string? ip)
    {
        if (ip is not null) connections[context.ConnectionId] = (context, ip);
    }
    public void Remove(string id) => connections.TryRemove(id, out _);
    public string[] Ips => connections.Values.Select(x => x.Ip).Distinct().ToArray();
    public void Abort(string ip)
    {
        foreach (var connection in connections.Values.Where(x => x.Ip == ip)) connection.Context.Abort();
    }
}

public sealed class IpConnectionMonitor(IServiceScopeFactory scopes, IpConnectionRegistry connections,
    IOptions<IpProtectionOptions> options, ILogger<IpConnectionMonitor> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            if (!options.Value.Enabled) continue;
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var protection = scope.ServiceProvider.GetRequiredService<IpProtectionService>();
                foreach (var batch in connections.Ips.Chunk(500))
                {
                    var now = DateTime.UtcNow;
                    var banned = await db.IpAccessStates.AsNoTracking().Where(x => batch.Contains(x.Ip) && x.BannedUntil > now)
                        .Select(x => x.Ip).ToListAsync(stoppingToken);
                    foreach (var ip in banned.Where(ip => !protection.IsExempt(ip))) connections.Abort(ip);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Close existing sockets if their ban status cannot be established.
                foreach (var ip in connections.Ips) connections.Abort(ip);
                logger.LogError("IP socket protection failed; classification={ExceptionType}", ex.GetType().Name);
            }
        }
    }
}
