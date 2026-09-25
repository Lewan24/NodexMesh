# Development guide

## Requirements

- .NET 10 SDK
- Node.js/npm compatible with the lockfile
- PostgreSQL 17 for the API and PostgreSQL-backed tests
- Docker/Compose if using the containerized stack

## Local setup

Configure the API with .NET user secrets or environment variables. A new database requires all four values below; the administrator password must satisfy the Identity policy and is never generated into logs.

```bash
dotnet user-secrets set --project Backend/src/NodexMeshApi "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=nodexmesh;Username=nodexmesh_app;Password=..."
dotnet user-secrets set --project Backend/src/NodexMeshApi "Jwt:Key" "at-least-32-random-characters"
dotnet user-secrets set --project Backend/src/NodexMeshApi "Admin:Email" "admin@example.com"
dotnet user-secrets set --project Backend/src/NodexMeshApi "Admin:Password" "a-strong-bootstrap-password"
dotnet run --project Backend/src/NodexMeshApi --launch-profile http
```

Then start the frontend:

```bash
cd Frontend
npm install
npm run dev
```

Vite proxies `/api` and `/hubs` to `http://localhost:5215`. Set `API_PROXY_TARGET` before starting Vite to use another backend address. The API's Scalar/OpenAPI UI is available in Development only.

## Repository structure

```text
Backend/src/NodexMeshApi/
  Auditing/       audit capture, queries, detection, retention, console formatting
  Common/         roles, exceptions, transport and security middleware
  Data/           AppDbContext
  Dtos/           wire contracts
  Endpoints/      minimal API route groups
  Migrations/     committed EF Core migrations
  Models/         Identity and application entities/item data contracts
  Services/       authorization, mutation, sharing, library, tokens, collaboration

Backend/tests/NodexMeshApi.Tests/
  Auditing/ Endpoints/ Security/ Services/ Smoke/ Unit/

Frontend/src/
  app/            composition, theme provider, global styles
  entities/       board/project/user types and validation
  features/       auth, board, blocks, canvas, comments, library, projects, version
  layout/         app bar and tool sidebar
  shared/         API client, dialogs, i18n, shared hooks

Frontend/tests/   Node test-runner regression suite
docs/             maintained project documentation
```

The canvas does not call HTTP directly. UI hooks use `WorkspaceController`, which talks through matching mock or HTTP repository interfaces. `boardAdapter.ts` maps between the UI project model and normalized persisted records.

## Data modes and demo

HTTP is the default:

```dotenv
VITE_DATA_SOURCE=http
VITE_API_BASE_URL=/api/v1
```

Set `VITE_DATA_SOURCE=mock` for the offline demo. Mock projects are stored in `localStorage` under `nodexmesh_api_mock_v1_<userId>`. Mock accounts/sessions are illustrative and are not a security boundary. Server-only features are disabled.

The bundled demo project is [demoProject.json](../Frontend/src/entities/project/demoProject.json). To update it:

1. Export a complete project from the application.
2. Replace `Frontend/src/entities/project/demoProject.json` with the version 2 `nodexmesh-project` export.
3. Use portable HTTPS URLs, built-in icons/emoji, or embedded SVG. Do not leave `library://` references in the offline demo.
4. Run frontend formatting, tests, and build.

The public demo URL in the root README is intentionally permanent. Existing browser-local demo data is not overwritten until the user resets the demo.

## Import and export

Import accepts version 1 single-board and version 2 multi-board exports up to 20 MiB. Import remaps project, board, item, and comment identifiers while preserving internal relationships. Version 2 exports active boards, items, relations, tags, and comments; it excludes project trash, memberships, audit history, personal appearance defaults, and file bytes.

`library://<projectId>/<assetId>` references are references only. JSON export does not copy media, grant access, or create public links. A portable backup with files would require a separate archive format.

## Code quality and verification

Frontend formatting follows `Frontend/AGENTS.md` and the checked-in Prettier/EditorConfig settings.

```bash
cd Frontend
npm run format
npm run format:check
npm test
npm run build
```

```bash
dotnet test Backend/tests/NodexMeshApi.Tests -m:1
dotnet build Backend/src/NodexMeshApi --no-restore
dotnet ef migrations has-pending-model-changes --project Backend/src/NodexMeshApi --no-build
```

PostgreSQL-specific tests use `AUDIT_TEST_POSTGRES` and/or `NodexMesh_PersistenceTestConnection`. Point them only at a disposable database where the test user may create and drop schemas. Tests do not use application tables.
