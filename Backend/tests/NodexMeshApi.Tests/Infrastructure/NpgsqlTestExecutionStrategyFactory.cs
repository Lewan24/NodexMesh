using Microsoft.EntityFrameworkCore.Storage;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace NodexMeshApi.Tests.Infrastructure;

// Exercise PostgreSQL's transaction/retry rules while keeping the isolated SQLite database.
public sealed class NpgsqlTestExecutionStrategyFactory(ExecutionStrategyDependencies dependencies)
    : IExecutionStrategyFactory
{
    public IExecutionStrategy Create() => new NpgsqlRetryingExecutionStrategy(dependencies, 1, TimeSpan.Zero, null);
}
