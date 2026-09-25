# NodexMesh

NodexMesh is a self-hosted collaborative visual workspace for building multi-board projects from typed blocks. It has a React 19/Vite frontend and a .NET 10/PostgreSQL API.

## Demo

The always-available demo is hosted at:

https://nodexmesh.lewanmordor.workers.dev

The demo runs in browser-local mock mode. It includes the editor and bundled sample project, but it deliberately does not provide server persistence, accounts, project sharing, the media library, administration, audit logging, or multi-user collaboration.

## Features

- 21 persisted board item types: board links, section titles, notes, text, documents, code, icons, images, links, embeds, checklists, Kanban, timelines, columns, frames, dispensers, lines, drawings, mind maps, diagrams, and database diagrams.
- Multi-board projects, search, tags, comments, item/project trash, JSON import/export, undo/redo, clipboard operations, alignment guides, custom appearance, custom block CSS, and English/Polish UI.
- JWT access tokens, rotating HttpOnly refresh cookies, registration control, profiles, password changes, blocked-account checks, and a bootstrap administrator.
- Project roles: Owner, Editor, Commenter, and Viewer. Commenters can manage their own comments; Editors can change boards; Owners manage membership, public links, and project lifecycle.
- Optimistic revisions, idempotent board mutations, recovery drafts, polling fallback, SignalR board invalidation, collaborator selection/editing presence, and remote cursors.
- Public read-only project links and explicitly shared public media links.
- A project media library for PNG, JPEG, GIF, WebP, restricted SVG, MP4, and WebM files.
- Administration for users, roles, passwords, appearance resets, registration, projects, ownership transfer, recovery/purge, and audit incidents.
- Transactional application audit events, security-event detection, retention jobs, PostgreSQL persistence, health/version endpoints, rate limiting, and Docker deployment.

## Quick start with Docker

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD, JWT_KEY, and ADMIN_PASSWORD.
docker compose build --no-cache
docker compose up -d
```

Open the application at <http://localhost:3000>, the API at <http://localhost:8080>, and Adminer at <http://localhost:8081>. The API applies committed EF Core migrations at startup. PostgreSQL and uploaded library files use named volumes.

For the standalone Docker Hub/Portainer stack, use [docker-compose.production.yml](docker-compose.production.yml) and follow [the deployment guide](docs/DEPLOYMENT.md). Production requires an HTTPS reverse proxy with WebSocket support.

## Local development

Start PostgreSQL, configure `ConnectionStrings:Default`, `Jwt:Key`, `Admin:Email`, and `Admin:Password`, then run:

```bash
dotnet restore Backend/src/NodexMeshApi/NodexMeshApi.csproj
dotnet run --project Backend/src/NodexMeshApi --launch-profile http
```

In another shell:

```bash
cd Frontend
npm install
npm run dev
```

The frontend defaults to the HTTP adapter and `/api/v1`. Vite proxies API and SignalR traffic to `http://localhost:5215`; override that address with `API_PROXY_TARGET`. Set `VITE_DATA_SOURCE=mock` only for an offline/local-storage build.

## Architecture and documentation

| Path                               | Purpose                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `Frontend/src`                     | React application, canvas, blocks, adapters, sharing, library, and administration UI    |
| `Backend/src/NodexMeshApi`         | Minimal API, EF Core model/migrations, authorization, collaboration, audit, and storage |
| `Frontend/tests`                   | Node regression tests for editor and adapters                                           |
| `Backend/tests/NodexMeshApi.Tests` | Unit, endpoint, security, audit, and PostgreSQL-backed tests                            |
| `docs/API.md`                      | Current route and protocol reference                                                    |
| `docs/DATABASE.md`                 | Current persistence model                                                               |
| `docs/SECURITY.md`                 | Current security posture and remaining deployment work                                  |
| `docs/collaboration.md`            | Save, recovery, SignalR, and scaling model                                              |
| `docs/AUDIT.md`                    | Audit storage, detection, retention, and proxy guidance                                 |
| `docs/DEPLOYMENT.md`               | Local and production container deployment                                               |

## API overview

Routes are under `/api/v1` unless noted. The API exposes authentication/profile/default-project operations; project, board, tag, comment, trash, membership and sharing operations; appearance and library operations; administrator users/projects/settings/audit operations; anonymous public project/media reads; version checks; `/hubs/collaboration`; and `/health`.

See [docs/API.md](docs/API.md) for the complete route inventory, permissions, request rules, and mutation protocol. The [documentation index](docs/README.md) links every maintained guide.

## Verification

```bash
dotnet test Backend/tests/NodexMeshApi.Tests -m:1
dotnet build Backend/src/NodexMeshApi --no-restore
dotnet ef migrations has-pending-model-changes --project Backend/src/NodexMeshApi --no-build
cd Frontend
npm run format:check
npm test
npm run build
```

PostgreSQL-specific tests require the disposable test connection described in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

## Remaining roadmap

Implemented milestones that older plans listed as future work include the backend/API, migrations, multi-board persistence, sharing UI, public links, Commenter permissions, ownership transfer, project/item recovery, media library, SignalR invalidation and presence, administration, security tests, and structured audit events.

Current priorities are measured large-board performance work (viewport culling and on-demand heavy editors), richer same-field conflict resolution/CRDT evaluation, multi-instance SignalR and presence infrastructure, email verification and self-service password recovery, distributed rate limiting, production secret/role separation, immutable external audit retention, backups, and pinned/versioned container releases.

## License

NodexMesh is released under the [MIT License](LICENSE).
