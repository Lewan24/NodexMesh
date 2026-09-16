# Backend regression checks

Run from the repository root with the .NET 10 SDK:

```bash
dotnet run --project Backend/tests/TransportSmokeTests
dotnet run --project Backend/tests/MutationValidationSmokeTests
dotnet run --project Backend/tests/MutationPersistenceSmokeTests
```

The transport and validation checks start temporary localhost HTTP listeners and
need no database. Mutation validation uses the application's actual DTO and board
validator source files with `AddValidation()`, covering JSON payload traversal,
insert/update/delete requests, invalid batches, invalid item data, and appearance
payloads. Both constructor parameters and properties of positional records need
`SkipValidation` for `JsonElement` on the current .NET 10 validation generator;
annotating only properties does not prevent the indexer exception. Item JSON is
still checked by `BoardValidator`.

Persistence checks load `ConnectionStrings:Default` from the backend's settings,
Development settings, `nodexmesh-api` user secrets, then environment variables.
They create a uniquely named schema in that PostgreSQL database, exercise the real
mutation service with connection retries enabled, and drop the schema in `finally`.
The database user needs permission to create schemas. Existing application tables
are not used. Checks cover insert, move, snapshot reload, deletion, stale revisions,
and replay of an already committed mutation ID.

Tag checks cover normalized-name reuse, concurrent creation, project permissions,
invalid and foreign tag IDs, retaining assignments when moving items, and removal.
