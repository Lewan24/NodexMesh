using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NodexMeshApi.Auditing;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using Xunit;

namespace NodexMeshApi.Tests.Auditing;

public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    {
        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES")))
            Skip = "Set AUDIT_TEST_POSTGRES to a disposable PostgreSQL database.";
    }
}

public class PostgresAuditTests
{
    [PostgresFact]
    public async Task Migrations_InetJsonbQueriesDetectionAndConcurrency_WorkOnPostgres()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES"))
            .UseSnakeCaseNamingConvention().Options;
        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();
        db.Database.HasPendingModelChanges().Should().BeFalse();
        var script = db.GetService<IMigrator>().GenerateScript();
        script.Should().Contain("inet").And.Contain("jsonb").And.Contain("ix_audit_events_client_ip_occurred_at");
        var now = DateTime.UtcNow;
        var target = Guid.NewGuid();
        for (var i = 0; i < 5; i++) db.AuditEvents.Add(new AuditEvent
        {
            EventType = "auth.login_failed", TargetUserId = target, OccurredAt = now.AddSeconds(-1),
            ClientIp = "2001:db8::123", AccountKey = "postgres-test", Metadata = "{\"safe\":true}"
        });
        await db.SaveChangesAsync();
        var query = AuditEndpoints.Filter(db.AuditEvents.AsNoTracking(), new AuditQuery { ClientIp = "2001:db8::123", TargetUserId = target });
        (await query.CountAsync()).Should().Be(5);
        await AuditMaintenanceService.DetectAsync(db, new AuditOptions(), now, default);
        (await db.SecurityIncidents.AnyAsync(i => i.Rule == "login.ip_burst" && i.Subject == "2001:db8::123")).Should().BeTrue();
        var token = new RefreshToken { Id = Guid.NewGuid(), TokenHash = Guid.NewGuid().ToString(), CreatedAtUtc = now, ExpiresAtUtc = now.AddDays(1) };
        db.RefreshTokens.Add(token);
        await db.SaveChangesAsync();
        await using var other = new AppDbContext(options);
        var stale = await other.RefreshTokens.SingleAsync(t => t.Id == token.Id);
        token.RevokedAtUtc = now;
        stale.RevokedAtUtc = now;
        await db.SaveChangesAsync();
        await other.Invoking(d => d.SaveChangesAsync()).Should().ThrowAsync<DbUpdateConcurrencyException>();
        // Both public investigation filters and retention execute as provider SQL.
        await AuditMaintenanceService.PruneAsync(db, new AuditOptions(), now, default);
    }
}
