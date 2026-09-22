using FluentAssertions;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using NodexMeshApi.Data;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using Xunit;

namespace NodexMeshApi.Tests.Services;

public class ProjectDeletionServiceTests
{
    // SQLite has no native DateTimeOffset ordering; numeric UTC ticks preserve the
    // production cutoff semantics while exercising the real query and deletion path.
    public sealed class CleanupModelCustomizer(ModelCustomizerDependencies dependencies) : ModelCustomizer(dependencies)
    {
        public override void Customize(ModelBuilder modelBuilder, DbContext context)
        {
            base.Customize(modelBuilder, context);
            modelBuilder.Entity<Project>().Property(p => p.UserDeletedAt).HasConversion(
                value => value.HasValue ? value.Value.UtcTicks : (long?)null,
                value => value.HasValue ? new DateTimeOffset(value.Value, TimeSpan.Zero) : (DateTimeOffset?)null);
        }
    }

    [Fact]
    public async Task Cleanup_RemovesOnlyUserDeletedProjectsAtLeastThirtyDaysOld_WithTheirBoards()
    {
        using var connection = new SqliteConnection("DataSource=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection)
            .UseSnakeCaseNamingConvention().ReplaceService<IModelCustomizer, CleanupModelCustomizer>().Options;
        using var db = new AppDbContext(options);
        await db.Database.EnsureCreatedAsync();
        var now = new DateTimeOffset(2026, 9, 22, 12, 0, 0, TimeSpan.Zero);
        Project Make(string name, DateTimeOffset? trashed, DateTimeOffset? deleted) => new()
        {
            Id = Guid.NewGuid(), OwnerId = Guid.NewGuid(), Name = name, DeletedAt = trashed,
            UserDeletedAt = deleted, CreatedAt = now.AddDays(-100), UpdatedAt = now
        };
        var active = Make("Active", null, null);
        var trashed = Make("User trash", now.AddDays(-90), null);
        var recent = Make("Recoverable", now.AddDays(-90), now.AddDays(-29));
        var boundary = Make("At cutoff", now.AddDays(-90), now.AddDays(-30));
        var expired = Make("Expired", now.AddDays(-90), now.AddDays(-31));
        db.Projects.AddRange(active, trashed, recent, boundary, expired);
        db.Boards.Add(new Board { Id = Guid.NewGuid(), ProjectId = expired.Id, Name = "Retained content", CreatedAt = now, UpdatedAt = now });
        await db.SaveChangesAsync();
        (await ProjectDeletionService.CleanExpiredAsync(db, now)).Should().Be(2);
        var remaining = await db.Projects.IgnoreQueryFilters().Select(p => p.Id).ToListAsync();
        remaining.Should().BeEquivalentTo(new[] { active.Id, trashed.Id, recent.Id });
        (await db.Boards.IgnoreQueryFilters().CountAsync()).Should().Be(0);
        recent.UserDeletedAt = null;
        recent.DeletedAt = null;
        await db.SaveChangesAsync();
        (await ProjectDeletionService.CleanExpiredAsync(db, now.AddDays(60))).Should().Be(0);
    }
}
