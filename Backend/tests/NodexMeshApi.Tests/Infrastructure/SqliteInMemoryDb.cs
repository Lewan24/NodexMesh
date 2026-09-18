using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using NodexMeshApi.Data;

namespace NodexMeshApi.Tests.Infrastructure;

/// <summary>
/// Backs an <see cref="AppDbContext"/> with a private SQLite in-memory database for
/// service-level tests that need real EF Core behaviour (change tracking, concurrency
/// tokens, unique indexes, check constraints) without a real PostgreSQL server.
/// </summary>
/// <remarks>
/// SQLite's in-memory mode ties the database's lifetime to a single open connection, so
/// that connection is kept open for the life of the fixture and only ever closed on
/// dispose — closing it (or letting it go out of scope) destroys the data.
/// <see cref="AppDbContext"/>'s jsonb column types and Postgres-style CHECK constraints are
/// passed straight through to SQLite, which stores them as ordinary TEXT/CHECK — sufficient
/// for exercising the service layer's own logic, which never depends on Postgres-specific
/// behaviour (no raw SQL, no jsonb operators).
/// </remarks>
public sealed class SqliteInMemoryDb : IDisposable
{
    private readonly SqliteConnection _connection;
    private readonly DbContextOptions<AppDbContext> _options;

    public SqliteInMemoryDb()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        _options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .UseSnakeCaseNamingConvention()
            .Options;

        using var context = new AppDbContext(_options);
        context.Database.EnsureCreated();
    }

    /// <summary>
    /// A new <see cref="AppDbContext"/> instance against the same underlying database.
    /// Mirrors production, where each request gets its own scoped context, and catches
    /// bugs that only show up when data is read back through a fresh change tracker.
    /// </summary>
    public AppDbContext CreateContext() => new(_options);

    public void Dispose() => _connection.Dispose();
}
