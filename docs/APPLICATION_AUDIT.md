# Application auditing and deployment

The API reuses ILogger/Serilog, EF Core/Npgsql, existing authentication and the existing AdminOnly policy. No separate logging framework, message broker, or PostgreSQL server configuration is introduced.

## Storage and delivery

Apply `20260924112234_AddApplicationAudit` and the subsequent `AddAuditDetectionCheckpoint` EF migrations. The existing single-instance startup migration path applies both. For multiple replicas, apply migrations once before rollout:

```sh
dotnet ef database update --project Backend/src/NodexMeshApi
```

`audit_events` separates security, activity and diagnostic records using an indexed category column. This avoids duplicating identical models and allows investigations across categories. UUIDv7 identifiers, UTC timestamptz, inet addresses and controlled jsonb metadata are used. Composite time indexes support actor, target, project, IP, category, severity, event type and account correlation; request IDs have an index. Historical identifiers have no cascading foreign keys. `security_incidents` has a unique rule/subject/time-window grouping and review state. `audit_detection_checkpoints` records detection progress across restarts.

Tracked project, membership, share, library, board, account, token-revocation and registration-setting changes add audit rows **inside the same SaveChanges transaction**. An audit insert failure therefore prevents that database mutation from committing. Explicit transactions retain the same atomicity. The direct SQL library-share operation has an explicit transaction containing its audit insert. Unchanged tracked entities and share-link access counters are excluded. A board mutation produces a board-level record, not a record per canvas item.

Successful login/token rotation and detected token reuse stage explicit security records with the corresponding token changes. Password change/reset and administrative role changes are captured where Identity saves its changes. Multi-save existing account workflows are not converted into a new transaction: each committed step is independently audited.

Failed authentication, HTTP failures, logout and administrator reads use a separate context with a ten-second timeout, independent of a disconnected client's cancellation. Persistence failure preserves existing response semantics: the event and a Critical fallback record are emitted to console, and a process-local health counter increments. **These standalone events are not guaranteed to reach PostgreSQL during a database outage or process crash.** Configure durable Docker log collection and alert on event 4199; recovery from these console records is an operator task, not an automatic replay queue. No volatile queue is represented as durable. Mutation audit failures roll back the mutation instead.

## Event coverage

- `auth.login_succeeded`, `auth.login_failed`, `auth.login_locked`: account identifier, client IP, request correlation; supplied email is normalized and SHA-256 fingerprinted, not retained as plaintext. Fingerprints still count as personal data and can be dictionary-matched.
- `auth.refresh_rotated`, `auth.refresh_invalid`, `auth.refresh_expired`, `auth.refresh_revoked`, `auth.refresh_concurrent`, `auth.refresh_reuse`, `auth.session_revoked`, `auth.logout`.
- `auth.password_changed`, `admin.password_reset`, `admin.role_changed` and account creation/modification records.
- `project.added/modified/deleted`, `project.ownership_changed`, `projectmember.added/modified/deleted`, `projectsharelink.added/modified/deleted`, `libraryasset.added/modified/deleted`, `library.share_created`, `board.added/modified/deleted`, `systemsettings.added/modified`.
- Changes include field names and allowlisted old/new roles, owners, block/admin flags, expiry/revocation and deletion timestamps. No project names, content, file contents, passwords or tokens are serialized. A project's trash, user deletion and restoration appear as changed deletion fields.
- `http.validation_failed` (400/422), `http.unauthenticated` (401), `http.forbidden` (403), `http.unmatched` (routing 404), `http.method_rejected` (405), `http.rate_limited` (429), `http.server_error` (5xx).
- `admin.access` records sensitive administrative reads and successful administrative operations; `incident.reviewed` records review changes transactionally.

Ordinary successful GETs, health probes, intentional resource-not-found responses and normal redirects are not persisted by HTTP middleware. Unmatched paths are replaced entirely by `[unmatched]`; query strings, bodies and arbitrary headers are never copied. User-Agent is control-character stripped and capped at 256 characters. Routes are templates, so public share capabilities never enter route logs. Explicit authentication failures suppress duplicate generic HTTP failure records. Account lockout state changes remain separate database facts.

Console output uses readable timestamp/level headers and grouped audit details, omitting empty fields. Audit ID, actor, target, project, IP and correlation context remain available, and Serilog event properties stay structured internally. Important successes use Information, denials Warning, technical failures Error, reuse/persistence failures Critical. Successful mutations also emit `operation.completed` summaries after endpoint completion. This is an HTTP-operation summary; detailed authoritative changes are in PostgreSQL. Set `Serilog:MinimumLevel` using existing configuration; keep Debug/Trace and EF sensitive-data logging disabled in production. Inspect with `docker compose logs api` or `docker logs <api-container>`.

## Authentication compatibility

Refresh tokens retain their existing cookie, hashing and response format. `RevokedAtUtc` is now an optimistic concurrency token: two requests that read the same active token cannot both commit rotation. A stale writer returns the existing 401 response and emits `auth.refresh_concurrent`, without revoking the winning token. A request arriving after a completed rotation follows the existing policy of revoking **all active refresh tokens for that account**, not a nonexistent token-family model. Replay is a *suspected reuse signal*, not proof of theft; a late legitimate browser request can trigger that existing policy. Expired/revoked evidence remains subject to the existing refresh-token cleanup period. Access tokens retain their current expiry semantics.

New administrator bootstrap now requires `Admin__Password` supplied through deployment secrets if the configured account does not exist. It no longer prints a generated password. Existing accounts are unaffected. This deliberate configuration change is necessary to meet the no-password-in-logs requirement. There is no MFA, self-service password recovery, invitation acceptance/rejection lifecycle, or token-family model to instrument. Membership is immediate. Local browser exports cannot be observed by the API; server-side writes during import are covered as normal project/board/library operations.

## Trusted proxy deployment

Forwarded headers run before routing, auditing, transport security, authentication and rate limiting. `ClientIpResolver` consumes only the middleware-validated RemoteIpAddress, normalizes IPv4-mapped IPv6 and preserves native IPv6/null. Raw X-Forwarded-For is never read by audit/auth code.

The production Compose file now creates a dedicated `172.30.0.0/24` network and assigns the
frontend `172.30.0.10`, API `172.30.0.11`, and database `172.30.0.12`. It configures the API
with `ReverseProxy__KnownProxies__0=172.30.0.10` and `ReverseProxy__ForwardLimit=1`. This is
the correct one-hop trust boundary for the checked-in topology. If your deployment already
uses different addresses, replace those values with the actual stable frontend address and
subnet before starting the stack.

Configure actual deployment values, for example environment keys:

```text
ReverseProxy__KnownProxies__0=<immediate-proxy-IP>
ReverseProxy__KnownProxies__1=<outer-proxy-IP-if-needed>
ReverseProxy__KnownNetworks__0=<dedicated-trusted-proxy-CIDR-if-used>
ReverseProxy__ForwardLimit=<number-of-validated-hops>
```

Default arrays are empty and forwarding is disabled, including loopback. Do not use catch-all CIDRs, the entire LAN, or a shared container network containing untrusted workloads. Use exact addresses or a dedicated controlled proxy subnet. Never enable ASPNETCORE_FORWARDEDHEADERS_ENABLED as a replacement for this explicit trust configuration.

The checked-in topology is external TLS proxy → frontend Nginx → API. API has no production host-published port, but frontend port 3000 must be firewall-restricted to the TLS proxy. Frontend Nginx preserves `X-Forwarded-Proto` from Nginx Proxy Manager and forwards its sanitized single-client `X-Forwarded-For` value without appending another hop. Nginx Proxy Manager must discard browser-supplied forwarding headers and create one trusted client value. If NPM intentionally forwards a multi-address chain, this one-hop configuration is not sufficient; configure NPM to emit the resolved client address or configure every trusted hop and set the matching `ForwardLimit`.

Either configure Nginx real-IP processing with the exact outer proxy address, then send its verified `$remote_addr` and a sanitized scheme to the API (one trusted hop); or preserve a matching, sanitized For/Proto chain and configure both hops plus ForwardLimit=2. The edge proxy must discard client-supplied forwarding headers and create its own. Only a network-restricted internal frontend may preserve the trusted edge scheme. Never blindly forward arbitrary inbound headers from a publicly reachable frontend. Consult [ASP.NET Core forwarding guidance](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0).

Verification after deployment:

1. Sign in through HTTPS from a known external IPv4 address; inspect `auth.login_succeeded` in Administration → Audit. Match the address and ensure no HTTPS redirect loop.
2. Send the same request with a forged X-Forwarded-For to the public edge. The recorded address must remain the real client address. Repeat with native IPv6 where available.
3. Verify the API port cannot be reached from outside the trusted network. From an untrusted test peer, forwarded headers must not change attribution. Check every hop's header chain and configured forwarding limit.
4. Compare API correlation/time with edge logs. Requests rejected by the edge never reach application middleware. Configure edge logging separately with route/credential redaction, especially `/hubs` access_token query parameters and public capability paths. Automatic proxy-log ingestion is not implemented.

## Administration and detection

Existing administrators access the Audit tab. Server-side API permissions apply to all endpoints under `/api/v1/admin/audit`: paged events, event details, statistics, paged incidents and PATCH incident review status. Filters include UTC dates, category, severity, type, outcome, actor, target, project, IP, HTTP status, request ID and event/resource search. Ordering is oldest/newest with ID tie-breaking, pages contain at most 100 events. Summaries omit IP, User-Agent and metadata; authorized details expose them. Incidents link to an event; its request ID retrieves related records. UI times explicitly use UTC, with English/Polish labels and loading/error/empty states. The existing binary administrator model is reused; ordinary users cannot access these endpoints.

Detection runs once per minute against persisted history. Defaults: ten-minute windows; five failed logins/IP, five distinct accounts/IP, three distinct IPs/account, a success after five failures, ten 403s/IP, twenty unmatched routes/IP, ten 429s/IP. Reuse creates Critical incidents; privileged changes produce Information incidents. Adjust all corresponding `Audit` settings in appsettings/environment. Grouping suppresses repeat incidents within a window; review state is open/investigating/resolved. IP changes alone are not incidents. After downtime, the durable checkpoint catches up at most sixty minutes of history per cycle. There is no automated account blocking or external notification delivery.

## Retention, operations and limits

Defaults are operational starting points, not legal advice: security 180 days, activity 90, diagnostics 30, resolved incidents 365. Configure `Audit__SecurityRetentionDays`, `ActivityRetentionDays`, `DiagnosticRetentionDays`, `IncidentRetentionDays`. The worker deletes at most 1,000 rows per category per minute; monitor growth and vacuum/disk capacity. Open incidents preserve their referenced event. Archive before retention if required; automatic archive export is not provided.

Monitor `persistenceFailuresSinceStartup` from the protected statistics endpoint, Critical console events and the detection checkpoint lag. HTTP traffic is constrained by existing rate limits; attack-scale distributed traffic still requires edge controls. Detection uses indexed recent queries but is intentionally simple; benchmark thresholds and database capacity for the deployment. No partitioning is introduced without volume evidence.

The repository currently uses one application database principal for migrations, writes, reads and retention. There are no end-user database credentials. For production, use a separate migration owner, deny application UPDATE/TRUNCATE on audit_events, and restrict SELECT/INSERT/retention DELETE to the service principal; grant read-only access only to authorized investigators. A separate retention principal would require moving the cleanup job out of this service. Database grants cannot protect against a compromised application principal with retention rights or a database superuser. Immutable external log storage/backups are required for stronger integrity. These changes do not deploy new roles, alter production grants, configure PostgreSQL server logging or install pgAudit.

Remaining operational limitations: no automatic database-outage replay for standalone HTTP/security events; no proxy-side ingestion; infrastructure trust and log retention must be configured by operators; no tamper-evident external archive. These are explicit limits, not guarantees of lossless global auditing.

## Validation performed

- `dotnet test Backend/tests/NodexMeshApi.Tests --no-restore -m:1` with both `AUDIT_TEST_POSTGRES` and `NodexMesh_PersistenceTestConnection` set to a disposable PostgreSQL 17 instance: **327 passed, zero skipped**. This includes the application's existing persistence smoke test. Three subsequent refresh-specific audit cases also passed in the targeted audit suite (**26 audit tests** total).
- `dotnet build Backend/src/NodexMeshApi --no-restore`: passed with zero warnings/errors for the API.
- `dotnet ef migrations has-pending-model-changes --project Backend/src/NodexMeshApi --no-build`: no pending model changes. Both migrations were applied to the disposable database; inet/jsonb queries, detection, retention and concurrency were exercised against PostgreSQL.
- `npm run format`, `npm run format:check`, `npm run build` in Frontend: passed. Vite retains its existing large-chunk advisory.
- `npm run test` in Frontend: 11 test files passed, including the new audit UI test; the project-transfer file fails because the pre-existing fixture `Frontend/docs/NodexMesh.json` is absent. Running that file directly confirms 11 of its 12 cases pass and identifies ENOENT as the remaining failure. No replacement fixture was fabricated.

The database test uses a separate disposable PostgreSQL container, not the application's database. The test project still reports its existing SQLitePCLRaw vulnerability advisory and nullable warning; see [separate findings](AUDIT_SECURITY_FINDINGS.md).
- Final targeted verification after exception-log deduplication: `dotnet test Backend/tests/NodexMeshApi.Tests --no-restore -m:1 --filter 'FullyQualifiedName~Auditing|FullyQualifiedName~GlobalExceptionHandlerTests'`: **31 passed**, including all 26 audit cases.
