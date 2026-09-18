using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using Npgsql;
using Xunit;
using Xunit.Sdk;

namespace NodexMeshApi.Tests.Smoke;

public sealed class MutationPersistenceTests
{
    [PersistenceFact]
    public async Task MutationsAndTags_SurvivePostgresPersistenceAndRollback()
    {
        var connectionString = Environment.GetEnvironmentVariable("NodexMesh_PersistenceTestConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__Default");

        var schema = $"mutation_smoke_{Guid.NewGuid():N}";
        await using var connection = new NpgsqlConnection(connectionString!);
        await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE SCHEMA \"{schema}\"", connection))
            await create.ExecuteNonQueryAsync();

        try
        {
            var scopedConnection = new NpgsqlConnectionStringBuilder(connectionString) { SearchPath = schema };
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(scopedConnection.ConnectionString, postgres => postgres.EnableRetryOnFailure())
                .UseSnakeCaseNamingConvention().Options;
            await using var db = new AppDbContext(options);
            await db.Database.ExecuteSqlRawAsync(db.Database.GenerateCreateScript());
            var userId = Guid.NewGuid();
            var project = new Project { Id = Guid.NewGuid(), OwnerId = userId, Name = "Mutation smoke test" };
            var board = new Board { Id = Guid.NewGuid(), ProjectId = project.Id };
            db.Projects.Add(project);
            db.Boards.Add(board);
            await db.SaveChangesAsync();
            db.AppearanceProfiles.Add(new AppearanceProfile { UserId = userId, Mode = "dark" });
            var appearanceOverride = new ProjectAppearanceOverride
            {
                Id = Guid.NewGuid(), UserId = userId, ProjectId = project.Id, Mode = "light"
            };
            db.ProjectAppearanceOverrides.Add(appearanceOverride);
            await db.SaveChangesAsync();
            await using (var reloaded = new AppDbContext(options))
            {
                Assert.Equal("dark", (await reloaded.AppearanceProfiles.SingleAsync()).Mode);
                Assert.Equal("light", (await reloaded.ProjectAppearanceOverrides.SingleAsync()).Mode);
            }
            appearanceOverride.Mode = null;
            await db.SaveChangesAsync();
            await using (var reloaded = new AppDbContext(options))
                Assert.Null((await reloaded.ProjectAppearanceOverrides.SingleAsync()).Mode);

            var tags = new TagService(db, new ProjectAccessService(db));
            var tag = await tags.GetOrCreateAsync(project.Id, userId, "  Planning  ");
            var sameTag = await tags.GetOrCreateAsync(project.Id, userId, "ＰＬＡＮＮＩＮＧ");
            Assert.Equal(tag.Id, sameTag.Id);
            Assert.Equal("Planning", tag.Name);
            await AssertTagRejected(() => tags.GetOrCreateAsync(project.Id, userId, "   "), 422);
            await AssertTagRejected(() => tags.GetOrCreateAsync(project.Id, userId, new string('a', 65)), 422);
            await AssertTagRejected(() => tags.GetOrCreateAsync(project.Id, Guid.NewGuid(), "Private"), 404);
            var viewerId = Guid.NewGuid();
            db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = viewerId, Role = ProjectRole.Viewer });
            await db.SaveChangesAsync();
            await AssertTagRejected(() => tags.GetOrCreateAsync(project.Id, viewerId, "Read-only"), 403);

            var concurrent = await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
            {
                await using var otherDb = new AppDbContext(options);
                return await new TagService(otherDb, new ProjectAccessService(otherDb)).GetOrCreateAsync(project.Id, userId, "Concurrent");
            }));
            Assert.Single(concurrent.Select(t => t.Id).Distinct());

            var service = new BoardMutationService(db, NullLogger<BoardMutationService>.Instance, new PresenceRegistry());
            var item = new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 10, 20, null, null, 0, false,
                "note", 1, JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { content = "Saved" }));
            var insert = new BoardMutationDto(Guid.NewGuid(), 1, [new ItemMutationDto(item, null, [], [], [tag.Id.ToString()])], []);
            var inserted = await service.ApplyAsync(board.Id, userId, insert);
            Assert.Equal(200, inserted.Status);
            Assert.Equal(2, inserted.Result.BoardRevision);
            var replay = await service.ApplyAsync(board.Id, userId, insert);
            Assert.Equal(200, replay.Status);
            Assert.Equal(2, replay.Result.BoardRevision);
            var update = new BoardMutationDto(Guid.NewGuid(), 2, [new ItemMutationDto(item with { X = 99 }, 1, [], [], [tag.Id.ToString()])], []);
            var updated = await service.ApplyAsync(board.Id, userId, update);
            Assert.Equal(200, updated.Status);
            var loaded = await service.GetSnapshotAsync(board.Id);
            Assert.Equal(99, loaded.Items.Single().X);
            Assert.Equal(tag.Id, loaded.ItemTags.Single().TagId);

            var otherProject = new Project { Id = Guid.NewGuid(), OwnerId = userId, Name = "Other project" };
            db.Projects.Add(otherProject);
            await db.SaveChangesAsync();
            var foreignTag = await tags.GetOrCreateAsync(otherProject.Id, userId, "Planning");
            foreach (var invalidTag in new[] { foreignTag.Id.ToString(), Guid.NewGuid().ToString(), "not-a-uuid" })
            {
                await Assert.ThrowsAsync<ApiException>(() => service.ApplyAsync(board.Id, userId,
                    new BoardMutationDto(Guid.NewGuid(), 3, [new ItemMutationDto(item, 2, [], [], [invalidTag])], [])));
            }
            Assert.Equal(3, (await service.GetSnapshotAsync(board.Id)).Board.Revision);
            Assert.Equal(409, (await service.ApplyAsync(board.Id, userId, update with { ClientMutationId = Guid.NewGuid() })).Status);
            var untagged = await service.ApplyAsync(board.Id, userId, new BoardMutationDto(Guid.NewGuid(), 3,
                [new ItemMutationDto(item, 2, [], [], [])], []));
            Assert.Equal(200, untagged.Status);
            Assert.Empty((await service.GetSnapshotAsync(board.Id)).ItemTags);
            var deleted = await service.ApplyAsync(board.Id, userId,
                new BoardMutationDto(Guid.NewGuid(), 4, [], [new ItemDeleteDto(item.Id, 3)]));
            Assert.Equal(200, deleted.Status);
            Assert.Empty((await service.GetSnapshotAsync(board.Id)).Items);
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", connection);
            await drop.ExecuteNonQueryAsync();
        }
    }

    private sealed class PersistenceFactAttribute : FactAttribute
    {
        public PersistenceFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("NodexMesh_PersistenceTestConnection")) &&
                string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ConnectionStrings__Default")))
            {
                Skip = "Set NodexMesh_PersistenceTestConnection or ConnectionStrings__Default to run the PostgreSQL smoke test.";
            }
        }
    }

    private static async Task AssertTagRejected(Func<Task<TagRecordDto>> action, int status)
    {
        var error = await Assert.ThrowsAsync<ApiException>(action);
        Assert.Equal(status, error.StatusCode);
    }
}
