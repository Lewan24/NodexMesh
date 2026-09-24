# NodexMeshApi

Backend for [NodexMesh](https://github.com/Lewan24/NodexMesh) — .NET 10 minimal API,
PostgreSQL + EF Core, JWT access tokens with rotating refresh-token cookies, and
per-project collaboration roles.

The API is compile-verified with the repository's .NET SDK. Run the build and smoke tests
from the repository root before deploying.

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
  -e POSTGRES_PASSWORD='<choose-a-local-password>' \
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

`docs/API.md` has the full contract, including exact JSON shapes for all 20 board-item types.

## Security and administration

The API validates JWTs and refresh-token rotation, rejects blocked accounts, applies
project-role and admin authorization, rate limits authentication/public sharing, and uses
strict DTO validation. The first startup creates the configured administrator; provide
`Admin:Password` securely before initial account creation; passwords are never printed in API logs.
See the repository [README](../README.md) for the current API surface, security posture,
roadmap, and deployment guidance.

### Project recovery and collaboration

User deletion now has three states: active, trashed, and user-deleted. Trashed
projects remain in the owner's trash. Deleting from trash hides a project from
all users while retaining it for administrators. Admins can restore either
inactive state or permanently delete it; ownership and membership changes are
disabled until restoration. The hourly cleanup service permanently removes
user-deleted projects after 30 days (up to 100 per run). Apply the
`AddUserDeletedProjects` migration when updating; normal startup applies migrations.

Authenticated Viewers can select items and inspect tags and comments. Commenters
can additionally add comments and edit/delete their own comments. Comment writes
use `/api/v1/boards/{boardId}/items/{itemId}/comments`, with optimistic board
revision checks. Canvas mutations still require Editor access.

Admin appearance resets remove saved defaults so the frontend uses
`defaultAppearance` from `appearanceModel.ts`. Project override resets remain
independent. Active sessions reload appearance when focused.
