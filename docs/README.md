# NodexMesh documentation

The root [README](../README.md) is the product overview and quick start. Maintained detailed documentation lives here.

The [frontend review and refactor plan](FRONTEND_REVIEW.md) records the 2026-10-21 code review, focused improvements, validation findings, and staged follow-up work.

| Document                                       | Contents                                                                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [DEVELOPMENT.md](DEVELOPMENT.md)               | Local setup, repository structure, data adapters, demo data, import/export, and verification      |
| [DEPLOYMENT.md](DEPLOYMENT.md)                 | Docker Compose, Portainer, secrets, TLS/proxy settings, persistent volumes, and backups           |
| [REVERSE_PROXY.md](REVERSE_PROXY.md) | Exact Nginx Proxy Manager setup, real client IPs, refresh-safe quotas, bans and friendly IPs |
| [API.md](API.md)                               | HTTP/SignalR route inventory, permissions, transport rules, revisions, and mutation behavior      |
| [DATABASE.md](DATABASE.md)                     | Current EF Core/PostgreSQL model, migrations, deletion states, JSONB boundaries, and file storage |
| [SECURITY.md](SECURITY.md)                     | Implemented controls, trust boundaries, known limitations, and production checklist               |
| [collaboration.md](collaboration.md)           | Save queue, merge/recovery behavior, SignalR presence, and multi-instance limits                  |
| [AUDIT.md](AUDIT.md)                           | Application audit events, incident detection, retention, administration UI, and operations        |
| [BROWSER_PERFORMANCE.md](BROWSER_PERFORMANCE.md) | Browser FPS study, culling/retention policy, Playwright reproduction and measured limits |
| [CAMERA_PERFORMANCE.md](CAMERA_PERFORMANCE.md) | Live camera/content isolation, gesture previews, new measurements and the remaining 60 FPS plan |
| [WORKSPACE_RENDERING.md](WORKSPACE_RENDERING.md) | Full application rendering traces, repeated comparisons, grid caching and editor restoration |
| [PERFORMANCE.md](PERFORMANCE.md)               | Implemented canvas optimizations, remaining measured-work candidates, and profiling checklist     |
| [POSTGRESQL_LOGGING.md](POSTGRESQL_LOGGING.md) | Optional operator-managed PostgreSQL server logging                                               |

Historical implementation prompts, superseded readiness plans, duplicate component READMEs, and completed roadmaps were removed during the 2026-09-24 documentation audit. Git history remains the source for those historical documents.
