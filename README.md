# NodexMesh

NodexMesh is a self-hosted collaborative visual workspace. Users can create projects, arrange typed board items, connect items, share read-only boards, and collaborate through the web application. Administrators can manage users and project membership and control whether registration is available.

## Demo

Live demo:

https://nodexmesh.lewanmordor.workers.dev

---

Demo has almost all of the functionallities and features from **main** **branch**. Its prepared demo for local storage only, so collaboration and data persistence does not work.

**Main branch** has all new features like _admin panel_, _collaborations_, _project sharing_, _data persistence in database_, _full api implementation_, _many fixes and performance upgrades_.

Dev branch has all unstable but newest features, changes and fixes. Main branch is updated after tests and when stable version is prepared.

## Current capabilities

- JWT access tokens with rotating, HttpOnly refresh-token cookies.
- Project roles (`Owner`, `Editor`, `Viewer`) and server-side authorization for every project and board operation.
- Boards with typed items, relations, tags, comments, revisions, optimistic concurrency, and public read-only links.
- Administrator bootstrap on first startup, user blocking, password reset, project membership management, and registration toggle.
- PostgreSQL persistence, EF Core migrations, health endpoint, rate limiting, and SignalR collaboration transport.
- Development and production Docker builds for the frontend, API, PostgreSQL, and Adminer.

## Quick start with Docker

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and JWT_KEY in .env.
# Set ADMIN_PASSWORD securely before first startup.
docker compose build --no-cache
docker compose up
```

The application is available at <http://localhost:3000>. The API is available at
<http://localhost:8080> and Adminer at <http://localhost:8081>. PostgreSQL is kept on the
internal Docker network by default. The API applies pending migrations at startup.

For Docker Hub images and Portainer, use [docker-compose.production.yml](docker-compose.production.yml).
All configuration is inline; no `.env` or repository checkout is required. See
[production deployment instructions](DOCKER.md#production-with-docker-hub-images).

## Local development

### Backend

```bash
dotnet restore Backend/src/NodexMeshApi/NodexMeshApi.csproj
dotnet run --project Backend/src/NodexMeshApi --launch-profile http
```

Configure PostgreSQL, `Jwt:Key`, and the `Admin` settings through environment variables
or .NET user secrets. Do not commit real credentials. If `Admin:Password` is empty, the
bootstrap service refuses to create an account until a password is supplied securely.

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The Vite development proxy targets `http://localhost:5215` by default. Set
`API_PROXY_TARGET` when the API uses another address. The frontend calls the API under
`/api/v1` and sends credentials for the refresh cookie.

## API surface

All routes below are relative to `/api/v1` and require authentication unless marked public.

| Area | Routes | Purpose |
| --- | --- | --- |
| Auth | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/revoke`, `/auth/registration` | Sign in, refresh, sign out, and inspect registration availability |
| Projects | `/projects` | Create projects and manage the caller's project memberships |
| Boards | `/projects/{projectId}/boards`, `/boards/{boardId}` | Read and mutate board snapshots, items, relations, tags, comments, and revisions |
| Appearance | `/boards/{boardId}/appearance` | Persist the user's board appearance and theme preference |
| Public sharing | `/public/{token}` | Read-only access to a deliberately scoped public board projection |
| Administration | `/admin/users`, `/admin/projects`, `/admin/registration` | User blocking/password reset, project membership, and registration control; admin only |
| Collaboration | `/hubs/collaboration` | Authenticated SignalR updates |

See [Backend/docs/API.md](Backend/docs/API.md) for request and response contracts.

## Security posture

The API applies the main OWASP Top 10 controls relevant to this application:

- Identity uses ASP.NET Core Identity, strong password hashing, JWT validation, refresh-token rotation, revocation, and blocked-account checks.
- Authorization is enforced at route and project-role level; admin routes require an explicit admin claim and the database check prevents stale blocked tokens from being used.
- Request DTOs are strict and validated; board mutation payloads have size, type, URL, comment, and relation checks. EF Core parameterizes queries and uses foreign keys/check constraints.
- CORS is an explicit allowlist, cookie refresh requires the custom request header, rate limits cover auth and public sharing, and production enables HTTPS/HSTS.
- Responses use security headers and generic error messages; public links expose only the selected board and referenced tags/relations.
- Secrets are supplied through environment variables, user secrets, or Docker secrets. The repository contains no usable JWT, database, or admin password.

Production deployments still need TLS at the ingress/reverse proxy, managed secret storage, image pinning, backups, and centralized audit logging. These are deployment concerns and remain on the roadmap.

## Repository layout

```text
Backend/src/NodexMeshApi   .NET API, EF Core model, migrations, services, endpoints
Backend/tests               transport and mutation smoke tests
Frontend                    React/Vite client and production nginx image
docker-compose.yml          development stack (frontend, API, PostgreSQL, Adminer)
DOCKER.md                   compose secrets and image usage
```

## Verification

```bash
dotnet build Backend/src/NodexMeshApi/NodexMeshApi.csproj
dotnet ef migrations has-pending-model-changes \
  --project Backend/src/NodexMeshApi \
  --startup-project Backend/src/NodexMeshApi
dotnet run --project Backend/tests/TransportSmokeTests
dotnet run --project Backend/tests/MutationValidationSmokeTests
cd Frontend && npm run format:check && npm test && npm run build
```

## Roadmap

Completed: administration panel and bootstrap admin, registration toggle, blocked users,
password reset and session revocation, project membership management, appearance/theme
persistence, scoped public sharing, Docker development stack, and baseline API hardening.

Next: security integration tests, structured audit events, admin list pagination/filtering,
conflict resolution UX, real-time board updates, pinned production image digests, managed
secrets/TLS deployment examples, and publishing versioned images to Docker Hub.

## Configuration and secrets

See [DOCKER.md](DOCKER.md) for the simple `.env` setup and the Docker secrets variant.

## License

NodexMesh is released under the [MIT License](LICENSE).
