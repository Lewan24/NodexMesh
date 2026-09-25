# Application audit and incident detection

NodexMesh stores application/security/activity/diagnostic events in PostgreSQL and emits operational logs through Serilog. PostgreSQL server logs are separate; see [POSTGRESQL_LOGGING.md](POSTGRESQL_LOGGING.md).

## Storage and guarantees

Migrations `AddApplicationAudit` and `AddAuditDetectionCheckpoint` add `audit_events`, `security_incidents`, and durable detection checkpoints. Events use UUIDv7 identifiers, UTC timestamps, controlled JSONB metadata, normalized client IPs, request IDs, and indexed actor/target/project/account/category/severity/type fields.

Tracked project, membership, sharing, library, board, account, token-revocation, and registration-setting changes insert audit records inside the same `SaveChanges` transaction. An audit failure rolls back that mutation. Board mutations generate a board-level event, not one row per canvas item.

Failed authentication, HTTP failures, logout, and administrator reads use an independent short-lived context so a disconnected request cannot cancel the audit attempt. If PostgreSQL is unavailable, the event and a Critical fallback are written to console and a process-local failure counter increases. There is no durable replay queue for these standalone failures.

## Coverage

Events include:

- login success/failure/lockout; refresh rotation, invalid/expired/revoked/concurrent/reuse; session revocation/logout; password changes/resets;
- account creation/edit/block/admin-role changes and registration changes;
- project, membership, ownership, share-link, board, library asset/share, appearance-related tracked changes;
- 400/401/403/404/405/422/429/5xx request outcomes as appropriate;
- administrator reads/operations and incident review changes.

Metadata is allowlisted. Passwords, tokens, project names/content, file bytes, comment bodies, raw exception messages, and raw capability-bearing paths are not stored. Failed-login email identifiers are normalized and SHA-256 fingerprinted; those fingerprints remain personal data and may be dictionary-matched.

## Administration and detection

Administrators use the Audit tab and `/api/v1/admin/audit` endpoints to page/filter events, open event details, inspect statistics, list incidents, and set incident state to open/investigating/resolved. Filters include time, category, severity, event type/outcome, actor/target/project, IP, HTTP status, request ID, and event/resource search.

Detection runs each minute against persisted history. Defaults use ten-minute windows and create incidents for repeated login failures, one IP targeting multiple accounts, one account from multiple IPs, success after failures, 403/404/429 bursts, refresh reuse, and privileged changes. Grouping suppresses duplicates within a window. After downtime, the checkpoint catches up at most 60 minutes per cycle. Detection does not automatically block accounts or send notifications.

## Retention and operations

Defaults:

- security events: 180 days;
- activity events: 90 days;
- diagnostics: 30 days;
- resolved incidents: 365 days.

Configure the corresponding `Audit__*RetentionDays` values and detection thresholds. Cleanup deletes bounded batches each minute; monitor table growth, checkpoint lag, `persistenceFailuresSinceStartup`, console event 4199, disk capacity, and vacuum health. Open incidents retain the event they reference.

For stronger integrity, export to immutable external storage, use durable container logging, restrict audit table UPDATE/TRUNCATE, separate migration/runtime/retention principals, and grant read access only to investigators. The repository does not configure those database roles, archive export, proxy-log ingestion, or PostgreSQL server auditing.
