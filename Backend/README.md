# NodexMeshApi

Backend for [NodexMesh](https://github.com/Lewan24/NodexMesh) — .NET 10 minimal API,
PostgreSQL + EF Core, JWT access tokens with rotating refresh-token cookies, and
per-project collaboration roles.

> **Not compile-verified.** I had no .NET 10 SDK available when writing this, so treat the
> first `dotnet build` as part of the setup. Expect a handful of small fixes — most likely
> around package versions in the `.csproj` (I pinned plausible 10.0.0 versions that may not
> all exist yet) and the `AddValidation()` API surface. Everything else is written against
> the documented .NET 10 / EF Core 10 APIs.

## Layout

```
.
├── NodexMeshApi.sln
├── Dockerfile                  multi-stage, runs as non-root
├── docker-compose.yml          api + postgres
├── .env.example
├── .gitignore
├── API.md                      ← full endpoint + model reference (give this to an AI/frontend dev)
└── src/NodexMeshApi/
    ├── NodexMeshApi.csproj
    ├── Program.cs              composition root, rate limits, CORS, pipeline
    ├── appsettings.json        no secrets
    ├── appsettings.Development.json
    ├── Properties/launchSettings.json
    ├── Common/Common.cs        ProjectRole, ApiException, exception handler, security headers
    ├── Data/AppDbContext.cs    Fluent API, query filters, check constraints
    ├── Models/                 EF entities + the 20 per-item-type Data records
    ├── Dtos/                   wire contracts, revision-as-string converters
    ├── Services/               tokens, authorization, validation, board mutations, admin bootstrap
    ├── Endpoints/              auth, projects, board, administration
    └── OpenApi/                bearer scheme transformer for Scalar
```

## Local setup (without Docker)

```bash
# 1. Postgres
docker run -d --name nodexmesh-db \
  -e POSTGRES_DB=nodexmesh \
  -e POSTGRES_USER=nodexmesh_app \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 postgres:17-alpine

# 2. Secrets (never commit real values)
cd src/NodexMeshApi
dotnet user-secrets init
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"

# 3. Tooling + migration
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update

# 4. Run
dotnet run
```

Scalar UI: <https://localhost:7215/scalar/v1> (Development only).
Health check: `GET /health`.

The first startup creates `Admin:Email` as an administrator. Set `Admin:Password` to
use a chosen password, or leave it blank to generate a random password and print it
once. Administration endpoints are under `/api/v1/admin`; they manage users, blocked
accounts, registration availability, projects and project membership.

## Docker Compose

```bash
cp .env.example .env
# fill in POSTGRES_PASSWORD and JWT_KEY (openssl rand -base64 48)
docker compose up --build
```

The API applies migrations on startup (`MigrateAsync()`), so the first boot creates the
schema. Postgres isn't published to the host by default — uncomment the `ports` block in
`docker-compose.yml` if you want to connect a GUI client.

## Connecting the frontend

Set in `.env` of the SPA:

```
VITE_DATA_SOURCE=http
VITE_API_BASE_URL=/api/v1
```

Vite proxies `/api` to `http://localhost:5215`. Start the API with
`dotnet run --project Backend/src/NodexMeshApi --launch-profile http` from the
repository root (the `https` profile also exposes the HTTP port). Development
accepts HTTP without HTTPS redirects so requests stay on the frontend origin.
HTTPS redirection remains enabled outside Development.

For a different backend port, set the shell variable `API_PROXY_TARGET` when
starting Vite. A direct cross-origin `VITE_API_BASE_URL` must include `/api/v1`
and requires matching backend CORS and cookie settings.

On a fresh browser session, `POST /api/v1/auth/refresh` returning **401** is expected:
it means no refresh cookie exists and the frontend should show the login screen.
A **307** redirect is not expected through the development proxy; restart the
backend after changing middleware and ensure it runs in Development.

Transport regression checks (no database required):

```bash
dotnet run --project Backend/tests/TransportSmokeTests
```

Two things the HTTP client **must** do:

1. Send `X-Requested-With: nodexmesh-web` on every request. `/api/v1/auth/refresh`
   rejects anything without it — it's the CSRF guard, since that endpoint authenticates
   purely by cookie.
2. Send `credentials: 'include'` so the refresh cookie travels.

`API.md` has the full contract, including exact JSON shapes for all 20 board-item types.

## Next steps

1. `dotnet build` and fix whatever the compiler finds (see the note at the top).
2. Generate the initial migration and check the produced SQL against
   `nodexmesh-db-schema.md` — particularly the jsonb columns and check constraints.
3. Decide on the open design questions in `src/NodexMeshApi/README.md` — most importantly
   how real-time collaboration should merge concurrent edits, since that shapes the
   mutation model.
