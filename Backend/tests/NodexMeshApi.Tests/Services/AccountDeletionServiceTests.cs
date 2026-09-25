using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Storage;
using NodexMeshApi.Tests.Infrastructure;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class AccountDeletionServiceTests
{
    public sealed class CleanupModelCustomizer(ModelCustomizerDependencies dependencies) : ModelCustomizer(dependencies)
    {
        public override void Customize(ModelBuilder modelBuilder, DbContext context)
        {
            base.Customize(modelBuilder, context);
            modelBuilder.Entity<ApplicationUser>().Property(p => p.DeletionRequestedAt).HasConversion(
                value => value.HasValue ? value.Value.UtcTicks : (long?)null,
                value => value.HasValue ? new DateTimeOffset(value.Value, TimeSpan.Zero) : (DateTimeOffset?)null);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Cleanup_DeletesAtNinetyDays_AndPreservesRecentRestoredAndOrdinarilyBlockedAccounts(bool simulateTransientFailure)
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var failure = new FailOnceAfterSaveInterceptor();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection)
            .UseSnakeCaseNamingConvention().ReplaceService<IModelCustomizer, CleanupModelCustomizer>()
            .ReplaceService<IExecutionStrategyFactory, NpgsqlTestExecutionStrategyFactory>()
            .AddInterceptors(failure).Options;
        using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var now = DateTimeOffset.UtcNow;
        ApplicationUser Make(bool blocked, DateTimeOffset? deleted) => new()
        {
            Id = Guid.NewGuid(), IsBlocked = blocked, DeletionRequestedAt = deleted
        };
        var boundary = Make(true, now.AddDays(-90));
        var expired = Make(true, now.AddDays(-91));
        var recent = Make(true, now.AddDays(-90).AddSeconds(1));
        var blocked = Make(true, null);
        var restored = Make(false, null);
        db.Users.AddRange(boundary, expired, recent, blocked, restored);
        db.AppearanceProfiles.Add(new AppearanceProfile { UserId = expired.Id });
        db.RefreshTokens.Add(new RefreshToken { Id = Guid.NewGuid(), UserId = expired.Id, TokenHash = "test" });
        await db.SaveChangesAsync();
        failure.Armed = simulateTransientFailure;
        (await AccountDeletionService.CleanExpiredAsync(db, now)).Should().Be(2);
        failure.Failures.Should().Be(simulateTransientFailure ? 1 : 0);
        (await db.Users.Select(u => u.Id).ToListAsync()).Should().BeEquivalentTo([recent.Id, blocked.Id, restored.Id]);
        (await db.RefreshTokens.CountAsync()).Should().Be(0);
        (await db.AppearanceProfiles.CountAsync()).Should().Be(0);
        recent = await db.Users.SingleAsync(u => u.Id == recent.Id);
        recent.IsBlocked = false;
        recent.DeletionRequestedAt = null;
        await db.SaveChangesAsync();
        (await AccountDeletionService.CleanExpiredAsync(db, now.AddDays(100))).Should().Be(0);
    }

    private sealed class FailOnceAfterSaveInterceptor : SaveChangesInterceptor
    {
        public bool Armed { get; set; }
        public int Failures { get; private set; }

        public override ValueTask<int> SavedChangesAsync(SaveChangesCompletedEventData eventData, int result,
            CancellationToken cancellationToken = default)
        {
            if (Armed)
            {
                Armed = false;
                Failures++;
                // Save succeeded but the enclosing transaction must roll back and retry.
                throw new TimeoutException("Simulated transient database failure before commit.");
            }
            return ValueTask.FromResult(result);
        }
    }
}
