using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using NodexMeshApi.Auditing;
using NodexMeshApi.Data;

namespace NodexMeshApi.Tests.Auditing;

public sealed class IpProtectionPostgresTests
{
    [PostgresFact]
    public async Task ConcurrentFailuresArePersistedWithoutLostIncrementsAndBanIsAtomic()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(Environment.GetEnvironmentVariable("AUDIT_TEST_POSTGRES"))
            .UseSnakeCaseNamingConvention().Options;
        await using var db = new AppDbContext(options);
        await db.Database.MigrateAsync();
        db.Database.HasPendingModelChanges().Should().BeFalse();
        var ip = $"2001:db8::{Guid.NewGuid().ToString("N")[..8].Insert(4, ":")}";
        var settings = Microsoft.Extensions.Options.Options.Create(new IpProtectionOptions { FailedLoginThreshold = 20 });
        try
        {
            await Task.WhenAll(Enumerable.Range(0, 20).Select(async _ =>
            {
                await using var writer = new AppDbContext(options);
                await new IpProtectionService(writer, settings).RecordAsync(new AuditEvent { EventType = "auth.login_failed", ClientIp = ip }, default);
            }));
            var row = await db.IpAccessStates.SingleAsync(x => x.Ip == ip);
            row.FailedLogins.Should().Be(20);
            row.BannedUntil.Should().BeAfter(DateTime.UtcNow);
            (await db.AuditEvents.CountAsync(x => x.ClientIp == ip && x.EventType == "security.ip_banned")).Should().Be(1);
        }
        finally
        {
            await db.IpAccessStates.Where(x => x.Ip == ip).ExecuteDeleteAsync();
            await db.AuditEvents.Where(x => x.ClientIp == ip).ExecuteDeleteAsync();
        }
    }
}
