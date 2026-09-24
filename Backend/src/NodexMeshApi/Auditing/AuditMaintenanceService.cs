using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Data;

namespace NodexMeshApi.Auditing;

public sealed class AuditMaintenanceService(IServiceScopeFactory scopes, IOptions<AuditOptions> settings,
    ILogger<AuditMaintenanceService> logger, AuditHealth health) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var now = DateTime.UtcNow;
                var checkpoint = await db.AuditDetectionCheckpoints.SingleOrDefaultAsync(stoppingToken);
                if (checkpoint is null)
                {
                    var oldest = await db.AuditEvents.OrderBy(e => e.OccurredAt).Select(e => (DateTime?)e.OccurredAt).FirstOrDefaultAsync(stoppingToken);
                    checkpoint = new AuditDetectionCheckpoint { ProcessedThrough = oldest ?? now };
                    db.AuditDetectionCheckpoints.Add(checkpoint);
                    await db.SaveChangesAsync(stoppingToken);
                }
                // Bounded catch-up after an outage; each completed minute is durable.
                for (var batch = 0; batch < 60 && checkpoint.ProcessedThrough < now; batch++)
                {
                    var through = checkpoint.ProcessedThrough.AddMinutes(1);
                    if (through > now) through = now;
                    await DetectAsync(db, settings.Value, through, stoppingToken, logger);
                    checkpoint.ProcessedThrough = through;
                    await db.SaveChangesAsync(stoppingToken);
                }
                await PruneAsync(db, settings.Value, DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                health.Failed();
                logger.LogError("Audit maintenance failed ({ExceptionType}); retrying next minute", ex.GetType().Name);
            }
        }
    }

    public static async Task DetectAsync(AppDbContext db, AuditOptions options, DateTime now, CancellationToken ct, ILogger? logger = null)
    {
        var since = now.AddMinutes(-options.WindowMinutes);
        var recent = db.AuditEvents.AsNoTracking().Where(e => e.OccurredAt >= since && e.OccurredAt <= now);
        var failed = recent.Where(e => e.EventType == "auth.login_failed" || e.EventType == "auth.login_locked");
        var window = new DateTime(now.Ticks - now.Ticks % TimeSpan.FromMinutes(options.WindowMinutes).Ticks, DateTimeKind.Utc);
        async Task Add(string rule, string subject, Guid eventId, string severity = "Warning")
        {
            if (await db.SecurityIncidents.AnyAsync(i => i.Rule == rule && i.Subject == subject && i.WindowStart >= since, ct)) return;
            var incident = new SecurityIncident { Rule = rule, Subject = subject, EventId = eventId, WindowStart = window, Severity = severity };
            db.SecurityIncidents.Add(incident);
            try
            {
                await db.SaveChangesAsync(ct);
                logger?.Log(severity == "Critical" ? LogLevel.Critical : severity == "Warning" ? LogLevel.Warning : LogLevel.Information,
                    new EventId(4200, "security.incident_created"), "Security incident {IncidentId}: {Rule}, evidence {AuditId}", incident.Id, rule, eventId);
            }
            catch (DbUpdateException)
            {
                db.Entry(incident).State = EntityState.Detached;
                // A concurrent detector may have inserted the same grouping key.
                if (!await db.SecurityIncidents.AnyAsync(i => i.Rule == rule && i.Subject == subject && i.WindowStart == window, ct)) throw;
            }
        }
        foreach (var group in await failed.Where(e => e.ClientIp != null).GroupBy(e => e.ClientIp)
            .Select(g => new { Key = g.Key!, Count = g.Count(), Accounts = g.Select(e => e.AccountKey).Distinct().Count() }).ToListAsync(ct))
        {
            var id = await failed.Where(e => e.ClientIp == group.Key).OrderByDescending(e => e.OccurredAt).Select(e => e.Id).FirstAsync(ct);
            if (group.Count >= options.FailedLoginThreshold) await Add("login.ip_burst", group.Key, id);
            if (group.Accounts >= options.DistinctAccountsThreshold) await Add("login.account_spray", group.Key, id);
        }
        foreach (var group in await failed.Where(e => e.AccountKey != null && e.ClientIp != null).GroupBy(e => e.AccountKey)
            .Select(g => new { Key = g.Key!, Ips = g.Select(e => e.ClientIp).Distinct().Count() }).ToListAsync(ct))
        {
            if (group.Ips < options.DistinctIpsThreshold) continue;
            var id = await failed.Where(e => e.AccountKey == group.Key).OrderByDescending(e => e.OccurredAt).Select(e => e.Id).FirstAsync(ct);
            await Add("login.distributed", group.Key, id);
        }
        foreach (var success in await recent.Where(e => e.EventType == "auth.login_succeeded").ToListAsync(ct))
            if (await failed.CountAsync(e => e.AccountKey == success.AccountKey && e.OccurredAt < success.OccurredAt, ct) >= options.FailedLoginThreshold)
                await Add("login.success_after_failures", success.AccountKey!, success.Id);
        foreach (var (type, threshold) in new[] { ("http.forbidden", options.ForbiddenThreshold),
            ("http.unmatched", options.NotFoundThreshold), ("http.rate_limited", options.RateLimitThreshold) })
        {
            foreach (var key in await recent.Where(e => e.EventType == type && e.ClientIp != null)
                .GroupBy(e => e.ClientIp).Where(g => g.Count() >= threshold).Select(g => g.Key!).ToListAsync(ct))
            {
                var id = await recent.Where(e => e.EventType == type && e.ClientIp == key)
                    .OrderByDescending(e => e.OccurredAt).Select(e => e.Id).FirstAsync(ct);
                await Add(type + ".burst", key, id);
            }
        }
        foreach (var audit in await recent.Where(e => e.EventType == "auth.refresh_reuse"
            || (e.EventType == "admin.access" && e.Method != "GET") || e.EventType == "projectmember.modified"
            || e.EventType == "project.ownership_changed" || e.EventType == "admin.role_changed").ToListAsync(ct))
            await Add(audit.EventType, audit.TargetUserId?.ToString() ?? audit.ActorId?.ToString() ?? audit.Id.ToString(),
                audit.Id, audit.EventType == "auth.refresh_reuse" ? "Critical" : "Information");
    }

    public static async Task PruneAsync(AppDbContext db, AuditOptions options, DateTime now, CancellationToken ct)
    {
        var processedThrough = await db.AuditDetectionCheckpoints.Select(c => (DateTime?)c.ProcessedThrough).SingleOrDefaultAsync(ct);
        var detectedCutoff = (processedThrough ?? now).AddMinutes(-options.WindowMinutes);
        foreach (var (category, days) in new[] { ("security", options.SecurityRetentionDays),
            ("activity", options.ActivityRetentionDays), ("diagnostic", options.DiagnosticRetentionDays) })
        {
            var cutoff = now.AddDays(-days);
            if (cutoff > detectedCutoff) cutoff = detectedCutoff;
            var ids = await db.AuditEvents.Where(e => e.Category == category && e.OccurredAt < cutoff
                    && !db.SecurityIncidents.Any(i => i.EventId == e.Id && i.Status != "resolved"))
                .OrderBy(e => e.OccurredAt).Select(e => e.Id).Take(1000).ToListAsync(ct);
            await db.AuditEvents.Where(e => ids.Contains(e.Id)).ExecuteDeleteAsync(ct);
        }
        var incidentCutoff = now.AddDays(-options.IncidentRetentionDays);
        var old = await db.SecurityIncidents.Where(i => i.WindowStart < incidentCutoff && i.Status == "resolved")
            .OrderBy(i => i.WindowStart).Select(i => i.Id).Take(1000).ToListAsync(ct);
        await db.SecurityIncidents.Where(i => old.Contains(i.Id)).ExecuteDeleteAsync(ct);
    }
}
