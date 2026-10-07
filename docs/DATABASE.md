# Database and persistence

NodexMesh uses PostgreSQL 17 through EF Core 10 and Npgsql. The committed migrations are the source of truth; `AppDbContext` applies snake_case naming, constraints, indexes, relationships, and query filters.

## Current tables

| Area       | Tables                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| Identity   | ASP.NET Identity tables, `refresh_tokens`, `system_settings`                               |
| Projects   | `projects`, `project_members`, `project_share_links`                                       |
| Boards     | `boards`, `board_items`, `item_links`, `tags`, `item_tags`, `comments`, `idempotency_keys` |
| Appearance | `appearance_profiles`, `project_appearance_overrides`                                      |
| Library    | `library_assets` (metadata and share tokens; bytes are on filesystem storage)              |
| Audit      | `audit_events`, `security_incidents`, `audit_detection_checkpoints`                        |

Identifiers are UUIDs (normally UUIDv7 for newly created database records). Revisions use PostgreSQL `bigint` and are serialized as strings. Times are UTC `timestamptz`. Audit metadata and item data/appearance use controlled `jsonb`; searchable ownership, scope, lifecycle, and relationships remain relational.

## Board data

`board_items.type` discriminates 21 strict data contracts. Shared geometry, z-order, lock state, parent column, frame membership, appearance, revision, authorship, and deletion metadata are columns. Type-specific content stays in `data` JSONB. Unknown types/properties, invalid URLs, non-finite geometry, oversize payloads, and invalid relationships are rejected before commit.

Links, tags, item-tag joins, and comments are separate records. Column children are ordinary board items with `parent_item_id` and sort order. Board-card links, line endpoints, frame membership, and dispenser origin use explicit validated relationships rather than trusting duplicated client references.

## Lifecycle and retention

- A normal project delete sets `deleted_at` (owner trash). Owner restore clears it.
- "Permanent" user deletion moves a trashed project to `user_deleted_at`, hiding it from all project members while keeping a 30-day administrator recovery window.
- Administrators can restore either inactive state or irreversibly purge it.
- Board items use soft deletion and a project item-trash API; editor purge removes them permanently.
- Expired idempotency receipts, old revoked refresh/share records, orphaned media, and user-deleted projects are cleaned in bounded background batches.
- Audit categories have configurable retention; open incidents preserve their referenced event.

Global query filters hide deleted projects, boards, items, and comments from ordinary queries. Restore/administrative code explicitly bypasses filters and rechecks authorization.

## Concurrency and transactions

Project, board, item, and comment revisions prevent silent overwrites. Board mutations validate and write atomically and persist an idempotency receipt in the same transaction. Tracked business changes add audit rows in the same `SaveChanges` transaction, so a transactional audit failure prevents the business mutation from committing.

Library uploads cannot make filesystem and PostgreSQL writes one atomic transaction. The service streams to a generated file, validates content, serializes quota checks with a PostgreSQL advisory transaction lock, removes failed files, and runs orphan cleanup. Backups must include both the database and library volume.

## Migrations

Committed migrations currently cover initial storage, project share links, appearance mode, administration, board blocks, user-deleted projects, project library/retrievable library shares, and application audit/checkpoints.

Single-instance startup calls `MigrateAsync()`. For multiple replicas, run migrations once before rollout:

```bash
dotnet ef database update --project Backend/src/NodexMeshApi
dotnet ef migrations has-pending-model-changes --project Backend/src/NodexMeshApi
```

Production should separate the migration owner from the runtime principal. The checked-in Compose stack uses one principal for simplicity and does not install pgAudit or alter PostgreSQL server logging.


## Sidebar and MFA schema

Migration `20261006071013_SidebarWidthAndMfa` adds `appearance_profiles.sidebar_width`, backfilling existing rows to `184`, and MFA columns on `AspNetUsers`: preferred method (initial `email`), protected authenticator secret, and last accepted TOTP step. The existing Identity `two_factor_enabled` flag controls MFA enforcement.

`mfa_challenges` stores a hashed bearer token, user FK, purpose, method, security stamp, protected emailed-code hash/pending seed, target settings, attempts, consumption flag, and expiry. `mfa_recovery_codes` stores only a user-bound code hash and consumption flag. Both tables cascade on permanent user deletion; expired challenges are pruned hourly. Do not add either table's credential values to audit metadata. The snapshot includes concurrency tokens for challenge attempts/consumption, recovery consumption, and user TOTP steps.

Migration `20261006073236_BindRefreshTokensToSecurityStamp` adds nullable `refresh_tokens.security_stamp`. New sessions populate it; pre-migration sessions remain compatible for non-MFA accounts, while MFA-enabled accounts must sign in again.

Migration `20261006075102_DefaultSidebarWidth235` sets the database sidebar-width default to `235` and upgrades stored widths equal to the former `184` default. Other saved widths are preserved.


## Persistent IP protection

Migration `AddIpProtection` creates `ip_access_states`, keyed by a normalized IPv4/IPv6 string (45 characters). It stores a fixed failure window, four counters, last-seen time, optional ban expiry/reason and release timestamp/administrator. Indexes cover ban expiry and last-seen cleanup. A UUID `version` is an EF concurrency token for cross-instance counter updates and administrator release. Audit `security.ip_banned` is committed with the ban. Active bans survive restarts and remain until expiry/release; no in-memory cache is authoritative. Unbanned inactive states are removed under security audit retention.

Rich project tasks use the `RichProjectTasks` migration, which adds `projects.task_categories` as text
containing serialized category records. Existing rows initialize to `[]`, interpreted as the default
priority categories. Task descriptions, subtasks, assignments, category references, and deadlines remain
in existing board item JSON; no rewrite of task rows is required. Apply the migration before running
the updated API. Category updates participate in project optimistic concurrency and audit capture.
