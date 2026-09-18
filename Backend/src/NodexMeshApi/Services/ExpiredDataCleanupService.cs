using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;

namespace NodexMeshApi.Services;

/// <summary>
/// Prunes rows that are dead but never deleted by the request path.
/// </summary>
/// <remarks>
/// Without this, three tables grow without bound:
///
///   - idempotency_keys: one row per mutation batch, with the full response body as jsonb.
///     An active board with a 500 ms save debounce writes these continuously; they're only
///     useful for the 24h TTL. This is the fastest-growing table in the schema.
///   - refresh_tokens: one row per login AND per refresh (rotation inserts a new row every
///     15 minutes per active session).
///   - project_share_links: revoked/expired links keep occupying the unique token-hash index.
///
/// Unbounded growth is a slow availability problem (OWASP A04/API4), not just an
/// untidiness one — disk fills, autovacuum falls behind, and the token-hash lookup on the
/// anonymous read path degrades.
///
/// Deletes are batched and the loop runs hourly so it never takes a long lock.
/// </remarks>
public sealed class ExpiredDataCleanupService(
    IServiceScopeFactory scopeFactory,
    TimeProvider clock,
    ILogger<ExpiredDataCleanupService> logger) : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(1);

    /// <summary>Revoked/expired share links are kept this long so an owner can still see
    /// "this link was used N times" for a while after revoking it.</summary>
    private static readonly TimeSpan DeadShareLinkRetention = TimeSpan.FromDays(30);

    /// <summary>Revoked refresh tokens are retained briefly: reuse detection needs to find
    /// a revoked row to recognise replay. Deleting immediately would turn a stolen-token
    /// replay into a silent "unknown token" instead of triggering family revocation.</summary>
    private static readonly TimeSpan RevokedTokenRetention = TimeSpan.FromDays(7);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Small startup delay so cleanup never competes with migrations on boot.
        try { await Task.Delay(TimeSpan.FromMinutes(1), clock, stoppingToken); }
        catch (OperationCanceledException) { return; }

        using var timer = new PeriodicTimer(Interval, clock);

        do
        {
            try
            {
                await RunOnceAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                // Never let a transient database error kill the loop — it would silently
                // stop all cleanup until the next deployment.
                logger.LogError(ex, "Expired-data cleanup failed; will retry next cycle.");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task RunOnceAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var now = clock.GetUtcNow();

        // Cut-offs are computed here rather than inside the predicates: EF translates a
        // captured constant cleanly, but `now - someTimeSpan` inside an expression tree
        // is not reliably translatable to SQL.
        var nowUtc = now.UtcDateTime;
        var revokedTokenCutoff = nowUtc - RevokedTokenRetention;
        var deadLinkCutoff = now - DeadShareLinkRetention;

        var idempotency = await db.IdempotencyKeys
            .Where(k => k.ExpiresAt < now)
            .ExecuteDeleteAsync(ct);

        var refreshTokens = await db.RefreshTokens
            .Where(t => t.ExpiresAtUtc < nowUtc
                || (t.RevokedAtUtc != null && t.RevokedAtUtc < revokedTokenCutoff))
            .ExecuteDeleteAsync(ct);

        var shareLinks = await db.ProjectShareLinks
            .Where(l =>
                (l.RevokedAt != null && l.RevokedAt < deadLinkCutoff)
                || (l.ExpiresAt != null && l.ExpiresAt < deadLinkCutoff))
            .ExecuteDeleteAsync(ct);

        if (idempotency + refreshTokens + shareLinks > 0)
        {
            logger.LogInformation(
                "Cleanup removed {Idempotency} idempotency keys, {Tokens} refresh tokens, {Links} share links.",
                idempotency, refreshTokens, shareLinks);
        }
    }
}
