using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using NodexMeshApi.Common;
using NodexMeshApi.Data;
using NodexMeshApi.Dtos;
using NodexMeshApi.Models;
using NodexMeshApi.Services;
using Npgsql;

// All test tables live in a unique temporary schema.
var configuration = new ConfigurationBuilder()
    .SetBasePath(Path.GetFullPath("../../../../../src/NodexMeshApi", AppContext.BaseDirectory))
    .AddJsonFile("appsettings.json")
    .AddJsonFile("appsettings.Development.json", optional: true)
    .AddUserSecrets("nodexmesh-api")
    .AddEnvironmentVariables()
    .Build();
var connectionString = configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException("Configure ConnectionStrings:Default to run persistence tests.");
var schema = $"mutation_smoke_{Guid.NewGuid():N}";
await using var connection = new NpgsqlConnection(connectionString);
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
    var tags = new TagService(db, new ProjectAccessService(db));
    var tag = await tags.GetOrCreateAsync(project.Id, userId, "  Planning  ");
    var sameTag = await tags.GetOrCreateAsync(project.Id, userId, "ＰＬＡＮＮＩＮＧ");
    Require(tag.Id == sameTag.Id && tag.Name == "Planning", "tag names are trimmed and deduplicated with Unicode normalization");
    await RejectTag(() => tags.GetOrCreateAsync(project.Id, userId, "   "), 422, "empty tag rejected");
    await RejectTag(() => tags.GetOrCreateAsync(project.Id, userId, new string('a', 65)), 422, "long tag rejected");
    await RejectTag(() => tags.GetOrCreateAsync(project.Id, Guid.NewGuid(), "Private"), 404, "outsider cannot create tags");
    var viewerId = Guid.NewGuid();
    db.ProjectMembers.Add(new ProjectMember { ProjectId = project.Id, UserId = viewerId, Role = ProjectRole.Viewer });
    await db.SaveChangesAsync();
    await RejectTag(() => tags.GetOrCreateAsync(project.Id, viewerId, "Read-only"), 403, "viewer cannot create tags");
    var concurrent = await Task.WhenAll(Enumerable.Range(0, 4).Select(async _ =>
    {
        await using var otherDb = new AppDbContext(options);
        return await new TagService(otherDb, new ProjectAccessService(otherDb)).GetOrCreateAsync(project.Id, userId, "Concurrent");
    }));
    Require(concurrent.Select(t => t.Id).Distinct().Count() == 1, "concurrent tag creation returns one identity");
    var service = new BoardMutationService(db, NullLogger<BoardMutationService>.Instance);
    var item = new ItemWriteDto(Guid.NewGuid(), board.Id, null, null, 0, 10, 20, null, null, 0, false,
        "note", 1, JsonSerializer.SerializeToElement(new { }), JsonSerializer.SerializeToElement(new { content = "Saved" }));
    var insert = new BoardMutationDto(Guid.NewGuid(), 1, [new ItemMutationDto(item, null, [], [], [tag.Id.ToString()])], []);
    var inserted = await service.ApplyAsync(board.Id, userId, insert);
    Require(inserted.Status == 200 && inserted.Result.BoardRevision == 2, "insert commits with retry strategy enabled");
    var replay = await service.ApplyAsync(board.Id, userId, insert);
    Require(replay.Status == 200 && replay.Result.BoardRevision == 2, "retry replays without applying twice");
    var update = new BoardMutationDto(Guid.NewGuid(), 2, [new ItemMutationDto(item with { X = 99 }, 1, [], [], [tag.Id.ToString()])], []);
    var updated = await service.ApplyAsync(board.Id, userId, update);
    Require(updated.Status == 200 && updated.Result.BoardRevision == 3, "move commits");
    var loaded = await service.GetSnapshotAsync(board.Id);
    Require(loaded.Items.Single().X == 99 && loaded.Items.Single().Revision == 2, "snapshot returns persisted move");
    Require(loaded.ItemTags.Single().TagId == tag.Id && loaded.Tags.Any(t => t.Id == tag.Id), "tag assignment survives moves and reloads");
    var otherProject = new Project { Id = Guid.NewGuid(), OwnerId = userId, Name = "Other project" };
    db.Projects.Add(otherProject);
    await db.SaveChangesAsync();
    var foreignTag = await tags.GetOrCreateAsync(otherProject.Id, userId, "Planning");
    Require(foreignTag.Id != tag.Id, "tag identities are scoped to projects");
    foreach (var invalidTag in new[] { foreignTag.Id.ToString(), Guid.NewGuid().ToString(), "not-a-uuid" })
    {
        try
        {
            await service.ApplyAsync(board.Id, userId, new BoardMutationDto(Guid.NewGuid(), 3,
                [new ItemMutationDto(item, 2, [], [], [invalidTag])], []));
            throw new InvalidOperationException("Invalid tag should have been rejected.");
        }
        catch (ApiException error) when (error.StatusCode == 422 && error.Code == "invalid_tag") { }
    }
    Require((await service.GetSnapshotAsync(board.Id)).Board.Revision == 3, "invalid and foreign tags roll back without changing revisions");
    var stale = await service.ApplyAsync(board.Id, userId, update with { ClientMutationId = Guid.NewGuid() });
    Require(stale.Status == 409, "stale revision returns conflict");
    var untagged = await service.ApplyAsync(board.Id, userId, new BoardMutationDto(Guid.NewGuid(), 3,
        [new ItemMutationDto(item, 2, [], [], [])], []));
    Require(untagged.Status == 200 && (await service.GetSnapshotAsync(board.Id)).ItemTags.Count == 0, "removing tags persists");
    var deleted = await service.ApplyAsync(board.Id, userId,
        new BoardMutationDto(Guid.NewGuid(), 4, [], [new ItemDeleteDto(item.Id, 3)]));
    Require(deleted.Status == 200 && (await service.GetSnapshotAsync(board.Id)).Items.Count == 0, "delete commits");
}
finally
{
    await using var drop = new NpgsqlCommand($"DROP SCHEMA \"{schema}\" CASCADE", connection);
    await drop.ExecuteNonQueryAsync();
}

static void Require(bool condition, string message)
{
    if (!condition) throw new InvalidOperationException(message);
    Console.WriteLine($"PASS: {message}");
}

async Task RejectTag(Func<Task<TagRecordDto>> action, int status, string name)
{
    try { await action(); }
    catch (ApiException error) when (error.StatusCode == status) { Console.WriteLine($"PASS: {name}"); return; }
    throw new InvalidOperationException(name);
}
