# API reference

The API is a .NET 10 minimal API. The base path is `/api/v1`; `/health` and `/hubs/collaboration` are outside that prefix. Development exposes generated OpenAPI and Scalar documentation.

## Client rules

- Send `Authorization: Bearer <access-token>` for authenticated routes. Access tokens are short-lived and kept in frontend memory.
- Send `credentials: include` and `X-Requested-With: nodexmesh-web` on API requests. Refresh authentication uses an HttpOnly cookie scoped to `/api/v1/auth` and the custom header is its CSRF guard.
- JSON uses camelCase. Revisions are decimal **strings**, because database `bigint` values can exceed JavaScript's safe integer range.
- Expected failures use Problem Details or the rate-limiter error shape. Handle at least 400, 401, 403, 404, 409, 413, 422, and 429; obey `Retry-After`.
- Do not automatically retry a write with a new mutation ID. Replaying the identical board mutation with its original ID is safe.
- Public project and media tokens are bearer credentials. Do not log them, place them in analytics, or leak them through referrers.

## Roles

`Owner > Editor > Commenter > Viewer`.

- Viewer: read projects/boards, inspect comments/tags, read the private library, and save personal project appearance.
- Commenter: Viewer permissions plus create/update/delete own comments.
- Editor: board/project content, boards, tags, comments, item trash, and library management.
- Owner: membership, public project/media links, project trash/restore/purge, and owner-only lifecycle operations.
- Administrator: global user/project/settings/audit APIs. Admin status does not implicitly grant ordinary access to every active project.

## Route inventory

Paths in the HTTP tables are relative to `/api/v1` unless a row explicitly says it is outside the prefix.

### Authentication and profile

| Method  | Path                    | Access/purpose                                                  |
| ------- | ----------------------- | --------------------------------------------------------------- |
| POST    | `/auth/register`        | Anonymous; only when registration is enabled                    |
| GET     | `/auth/registration`    | Anonymous registration status                                   |
| POST    | `/auth/login`           | Anonymous; returns a session or an MFA challenge |
| GET     | `/auth/mfa`             | Authenticated MFA settings and available methods                 |
| POST    | `/auth/mfa/start`       | Authenticated; password verification and settings challenge      |
| POST    | `/auth/mfa/complete`    | Authenticated; verify factors and save MFA settings               |
| POST    | `/auth/mfa/verify`      | Anonymous; verify login challenge and issue a session             |
| POST    | `/auth/refresh`         | Refresh cookie + custom header; rotates token                   |
| POST    | `/auth/revoke`          | Authenticated logout/session revocation                         |
| GET/PUT | `/auth/default-project` | Read/set the caller's accessible default project                |
| GET/PUT | `/auth/profile`         | Read/update own profile; email change requires current password |
| POST    | `/auth/password`        | Change own password and rotate/revoke sessions                  |

### Projects, sharing, and tags

| Method   | Path                                         | Minimum access                                                     |
| -------- | -------------------------------------------- | ------------------------------------------------------------------ |
| GET/POST | `/projects`                                  | Authenticated list/create                                          |
| GET      | `/projects/{projectId}`                      | Viewer                                                             |
| PATCH    | `/projects/{projectId}`                      | Editor; expected project revision                                  |
| DELETE   | `/projects/{projectId}`                      | Owner; move to user trash                                          |
| POST     | `/projects/{projectId}/restore`              | Owner; restore own trashed project                                 |
| DELETE   | `/projects/{projectId}/permanent`            | Owner; mark trashed project user-deleted for admin recovery window |
| POST     | `/projects/{projectId}/tags`                 | Editor                                                             |
| GET      | `/projects/{projectId}/participants`         | Member-safe display names for collaboration UI                     |
| GET      | `/projects/{projectId}/members`              | Viewer; emails are masked except where authorized                  |
| POST     | `/projects/{projectId}/members`              | Owner; invite existing account by email                            |
| PATCH    | `/projects/{projectId}/members/{userId}`     | Owner; change Editor/Commenter/Viewer role                         |
| DELETE   | `/projects/{projectId}/members/{userId}`     | Owner, or the member leaving                                       |
| GET/POST | `/projects/{projectId}/share-links`          | Owner; list/create public read-only links                          |
| DELETE   | `/projects/{projectId}/share-links/{linkId}` | Owner; revoke link                                                 |

Project share-link tokens are returned only when created and stored hashed. A project has at most 20 active links. Labels are at most 100 characters and optional expiry must be in the future.

### Boards, mutations, comments, and item trash

| Method       | Path                                                | Minimum access                              |
| ------------ | --------------------------------------------------- | ------------------------------------------- |
| GET          | `/projects/{projectId}/boards`                      | Viewer                                      |
| POST         | `/projects/{projectId}/boards`                      | Editor                                      |
| PATCH/DELETE | `/boards/{boardId}`                                 | Editor; rename/delete                       |
| GET          | `/boards/{boardId}`                                 | Viewer; complete normalized snapshot        |
| GET          | `/boards/{boardId}/loading-manifest`                | Viewer; layout and revision without item content |
| POST         | `/boards/{boardId}/item-page`                       | Viewer; 1–50 distinct IDs and expected board revision |
| POST         | `/boards/{boardId}/mutations`                       | Editor; transactional mutation protocol     |
| PUT          | `/boards/{boardId}/items/{itemId}/comments`         | Commenter; board revision + upserts/deletes |
| GET          | `/projects/{projectId}/item-trash`                  | Viewer                                      |
| POST         | `/projects/{projectId}/item-trash/{itemId}/restore` | Editor; optional target board/position      |
| DELETE       | `/projects/{projectId}/item-trash/{itemId}`         | Editor; permanently delete item             |
| DELETE       | `/projects/{projectId}/item-trash`                  | Editor; empty item trash                    |

`GET /projects` supplies metadata and item counts without board content. Opening a project fetches its main board layout, then downloads item pages with up to three concurrent requests. Item pages include the selected items and their comments, tags, and outgoing links. Item-page reads have a separate 120/minute quota from mutation writes; the frontend respects Retry-After and retries transient read failures. Each page enforces board membership and the manifest revision; revision changes return 409 and trigger a bounded reload. The frontend validates cross-item relations after assembling all pages and keeps the loading board read-only to prevent incomplete projections from generating deletions. Existing complete-snapshot routes remain available for exports, collaboration refreshes, and child-board navigation.

Comment batches contain 1–100 changes. Commenters may alter only their own comments; Editors/Owners may manage all comments. Status values are `open`, `todo`, `in-progress`, and `resolved`.

### Appearance and library

| Method       | Path                                         | Minimum access                                      |
| ------------ | -------------------------------------------- | --------------------------------------------------- |
| GET/PUT      | `/appearance`                                | Authenticated personal defaults                     |
| PUT          | `/projects/{projectId}/appearance`           | Viewer personal override                            |
| GET          | `/projects/{projectId}/library`              | Viewer; returns capabilities/assets                 |
| POST         | `/projects/{projectId}/library?name=...`     | Editor; raw request body upload                     |
| GET          | `/projects/{projectId}/library/{id}/content` | Viewer                                              |
| PATCH/DELETE | `/projects/{projectId}/library/{id}`         | Editor; rename/delete                               |
| POST/DELETE  | `/projects/{projectId}/library/{id}/share`   | Owner; create/retrieve or revoke stable public link |
| GET          | `/library/shared/{token}`                    | Anonymous public media, range requests supported    |

Library uploads are streamed and signature-validated. Supported files are PNG, JPEG, GIF, WebP, SVG, MP4, WebM,
PDF, DOC/DOCX, XLS/XLSX, PPTX, RTF, UTF-8 TXT/CSV, and Markdown. Add `?download=true` to the authenticated content
endpoint to request the stored file name as a download.

Accepted uploads are PNG, JPEG, GIF, WebP, restricted static SVG, MP4, and WebM. Defaults are 50 MiB/file and 1 GiB/project. Authorization is checked on every private read.

### Public, administration, version, and health

| Method | Path                                            | Access/purpose                                     |
| ------ | ----------------------------------------------- | -------------------------------------------------- |
| GET    | `/public/shared/{token}`                        | Anonymous project/board list and public appearance |
| GET    | `/public/shared/{token}/boards/{boardId}`       | Anonymous sanitized read-only board                |
| GET    | `/version`, `/version/latest`, `/version/check` | Anonymous current/latest release information       |
| GET    | `/health`                                       | Anonymous health timestamp; outside `/api/v1`      |
| WS     | `/hubs/collaboration`                           | Authenticated SignalR hub; outside `/api/v1`       |

All `/admin/*` routes require the `AdminOnly` policy:

| Method   | Path                                           | Purpose                                      |
| -------- | ---------------------------------------------- | -------------------------------------------- |
| GET/POST | `/admin/users`                                 | List/create users                            |
| PUT      | `/admin/users/{userId}`                        | Edit email, display name, and admin role     |
| POST     | `/admin/users/{userId}/password`               | Reset password                               |
| POST     | `/admin/users/{userId}/appearance/reset`       | Reset defaults, project overrides, or all    |
| PATCH    | `/admin/users/{userId}/blocked`                | Block/unblock                                |
| GET      | `/admin/projects`                              | List projects for administration/recovery    |
| POST     | `/admin/projects/{projectId}/restore`          | Restore an inactive project                  |
| DELETE   | `/admin/projects/{projectId}/permanent`        | Irreversibly purge an inactive project       |
| PUT      | `/admin/projects/{projectId}/owner`            | Transfer ownership                           |
| POST     | `/admin/projects/{projectId}/members`          | Add a member                                 |
| DELETE   | `/admin/projects/{projectId}/members/{userId}` | Remove a member                              |
| GET/PUT  | `/admin/settings/registration`                 | Read/update registration availability        |
| GET      | `/admin/audit/events`                          | Filter/page audit summaries                  |
| GET      | `/admin/audit/events/{id}`                     | Read authorized event details                |
| GET      | `/admin/audit/statistics`                      | Counts, detection checkpoint, failure health |
| GET      | `/admin/audit/incidents`                       | Filter/page detected incidents               |
| PATCH    | `/admin/audit/incidents/{id}`                  | Set review state                             |

SignalR clients call `JoinProject`, `LeaveProject`, `UpdatePresence`, and `ClearPresence`; the server emits `BoardChanged`, `PresenceChanged`, and `PresenceCleared`.

## Board mutation protocol

`POST /boards/{boardId}/mutations` carries:

- `clientMutationId` (UUID);
- `expectedBoardRevision` (decimal string);
- item `upserts`, each with an `ItemWrite`, expected item revision, and full link/tag/comment replacement for that touched item;
- item `deletes`, each with expected revision.

The server checks authorization, project state, board/item revisions, schema/type constraints, references, limits, and graph integrity in a transaction. It increments revisions, writes an idempotency receipt, commits, then publishes a SignalR `BoardChanged` hint. A duplicate ID with the same body returns the prior result; the same ID with a different body returns 409. Notification failure does not undo a committed database mutation.

The 22 item discriminators are `board`, `section-title`, `note`, `text`, `document`, `code`, `icon`, `image`, `file`, `link`, `embed`, `checklist`, `kanban`, `timeline`, `column`, `frame`, `dispenser`, `line`, `drawing`, `mindmap`, `diagram`, and `database`. Current `schemaVersion` is 1. Exact field contracts live in `Backend/src/NodexMeshApi/Models/BoardItemData.cs` and the matching frontend `itemSchema.ts`.

## Limits

- global: 300 requests/minute per authenticated user or anonymous IP;
- login/register/profile-sensitive policy: 5/minute per IP;
- refresh: token bucket of 30/minute per IP;
- board mutations: 60/minute per user;
- anonymous public reads: 60/minute per IP;
- SignalR receive message: 32 KiB; presence additionally has server-side caps/throttling.


## MFA and appearance width

`POST /api/v1/auth/login` still accepts `{ email, password }`. With MFA disabled it returns the existing `AuthResponse`. With MFA enabled it returns `{ mfaRequired: true, challengeToken, method, expiresAt }`, with no access token or refresh cookie. `method` is `email`, `authenticator`, or `recovery` when mail is disabled and no authenticator is enrolled.

`POST /api/v1/auth/mfa/verify` accepts `{ challengeToken, code }`; success returns the existing `AuthResponse` and rotating refresh cookie. The code is the selected factor's six-digit code, or a single-use recovery code. A challenge expires after five minutes, permits five attempts, is bound to the user's security stamp and purpose, and is superseded by the next challenge of the same purpose. Invalid proofs return generic `401 invalid_mfa`. Failed MFA attempts also count toward the configured account lockout.

Authenticated settings endpoints:

| Endpoint | Body / result |
| --- | --- |
| `GET /auth/mfa` | `{ enabled, preferredMethod, authenticatorConfigured, emailAvailable, recoveryCodesRemaining }` |
| `POST /auth/mfa/start` | `{ currentPassword, enabled, preferredMethod: "email" \| "authenticator" }`; returns a management challenge. For first authenticator enrollment, also returns `setupSecret` and `setupUri`; the frontend encodes `setupUri` locally as a scannable QR code. |
| `POST /auth/mfa/complete` | `{ challengeToken, code, setupCode? }`; returns `{ auth: AuthResponse, recoveryCodes: string[] }`. Accept the new authentication response immediately. |

For an MFA-enabled account, `code` proves the current factor (or recovery code). Switching to a new authenticator also requires `setupCode` from that app. Switching from authenticator to email requires the emailed `setupCode`. First enrollment proves the selected new factor in `code`. Existing enrolled authenticators are retained when email becomes preferred, so they remain available if email is globally disabled. Each enabled-settings change replaces all recovery codes; disabling removes the secret and recovery codes. Ten recovery codes are shown only in the completion response. All settings changes invalidate old access tokens and refresh sessions and issue a fresh session.

Email MFA can only be enabled when effective global email delivery is enabled. Email codes use the mandatory `account.mfa-code` template and are independent of optional user notifications. Settings changes use `account.mfa-changed`. Changing an email address while MFA is enabled returns `409 mfa_email_change`; verify and disable MFA, change/confirm the address, then re-enable MFA. Password resets do not disable MFA.

`GET /api/v1/appearance` adds `sidebarWidth` (default `235`). The existing `PUT /appearance` accepts optional integer `sidebarWidth`, from `160` through `400`; omitted values use `235` for older-client compatibility. Width is private to the authenticated user's appearance profile and is not exposed through public project appearance.


## Administrator MFA recovery and IP protection

All `/api/v1/admin` routes require a current, active administrator session.

| Method | Route (relative to `/api/v1`) | Behavior |
| --- | --- | --- |
| POST | `/admin/users/{userId}/mfa/reset/start` | `{ currentPassword }`; verify administrator password and return `{ mfaRequired: false }` or a standard MFA challenge for the administrator. |
| POST | `/admin/users/{userId}/mfa/reset` | `{ currentPassword, reason, challengeToken?, code? }`; verify current administrator factor when enabled, disable the target’s MFA, invalidate credentials/sessions and notify target; 204. |
| GET | `/admin/security/ips?status=banned&search=192.0.2&page=1` | `{ items, total }`; 50 per page. `status` is `banned`, `suspicious` (not currently banned), or `all`; optional substring IP search. |
| POST | `/admin/security/ips` | `{ ip, reason, durationMinutes?, forever? }`; add a manual IPv4/IPv6 ban (default 60 minutes; range 1–43,200); 204. |
| POST | `/admin/security/ips/{ip}/release` | `{ reason }`; clear ban/failure counters and record releasing administrator; 204. URL-encode IPv6 addresses. |
| GET | `/security/ip-check` | Anonymous 204 when allowed; 403 when banned; independent high gate quota can return 429. Used by Nginx’s internal gate, contains no IP data and accepts no caller-supplied IP parameter. |

Reset/release reasons are required (5–500 characters). Passwords are limited to 256 characters. Reset/start/release use the strict IP rate limiter. Self-reset returns 409 `self_mfa_reset`; unknown targets/records return 404; failed password/factor proofs return 401. Reset challenges use the existing five-minute expiry, attempt limits and replay protections and cannot be used for another target. Recovery codes can prove the administrator’s existing factor if SMTP is unavailable. A reset does not unblock a blocked account or cancel pending deletion. Invalid IP syntax returns 422. Concurrent release changes return 409 and require refresh/retry.

IP records include `ip`, `windowStart`, `lastSeen`, per-rule counters (`failedLogins`, `unauthorized`, `notFound`, `rateLimited`), `bannedUntil`, `reason`, `releasedAt` and `releasedBy`. Timestamps are UTC. Active bans reject all HTTP routes with 403 `ip_banned`, including admin and login routes; no authenticated bypass exists. The frontend gate emits Nginx’s own 403 page. Expired/suspicious records remain available until retention cleanup.


Manual bans normalize IPv6 and mapped IPv4 addresses, persist in the existing IP state table and use the same site/API/live-socket enforcement as automatic bans. Supply a complete address without a port, CIDR prefix or IPv6 scope suffix. Malformed addresses return 422; invalid duration/reason fields return 400. A current-IP ban returns 409 `self_ip_ban`, an allowlisted address returns 409 `ip_allowlisted`, disabled protection returns 409 `ip_protection_disabled`, and an active duplicate ban returns 409 `ip_already_banned`. Release an active ban before replacing its duration. Successful manual bans record `admin.ip_banned` with the actor, normalized IP, reason and expiry. Manual ban creation uses the strict rate limiter.


## Refresh-safe IP quotas and friendly clients

`RateLimiting` now configures anonymous browsing (2,000/IP/minute), authenticated browsing (1,000/user/minute), refresh (120/IP/minute), gate checks (10,000/IP/minute) and sensitive authentication (5/IP/minute). The gate does not consume browsing capacity. `IpProtection:Allowlist` bypasses bans and global browsing/gate limits only; named authentication/resource policies and account lockout remain. 429 responses no longer trigger persistent bans by default. Ban defaults are 10 failed login/MFA attempts, 100 non-bootstrap unauthorized responses or 100 scanner-like unmatched routes in 10 minutes, with 60-minute expiry. See [REVERSE_PROXY.md](REVERSE_PROXY.md) for exact Compose/NPM settings and existing-ban recovery.

## Partial checklist and kanban reads

`GET /boards/{boardId}?includeCompleted=false` and `POST /boards/{boardId}/item-page` with `includeCompleted: false` omit completed checklist entries and kanban cards only where block `data.hideCompleted` is true. Missing/false preferences show all tasks. The frontend opts into these partial reads; omitted/true flags retain complete API responses for compatibility with older clients. Omitted entries are counted in optional item-level `taskSummary: { completedCount, columns }`; `columns` maps kanban column IDs to omitted counts. Empty columns remain in `data`. Other block types are unchanged. `GET /boards/{boardId}?includeCompleted=true` returns complete data (used by project export); `includeCompleted=false&includeCompletedFor=<comma-separated IDs>` expands up to 100 selected blocks. All reads require Viewer access to the board. Comment-save and trash-restore responses accept the same query flags; the frontend requests partial snapshots from those paths too.

`GET /boards/{boardId}/items/{itemId}/completed-tasks?expectedRevision=<item revision>` returns the block's task data containing only completed entries/cards. It requires board access and item scope, returns 404 for inaccessible/missing items, and 409 when the item revision changed. Merge the result by task ID into the current local view.

Item writes may set `preserveCompletedTasks: true` outside `data` when editing partial task payloads. The backend retains stored completed tasks in surviving lists/columns, validates the merged payload and enforces existing revision/idempotency checks. This flag is only valid for existing checklist/kanban blocks of the same type. Omit it or set it to false when editing fully loaded tasks. The canvas automatically fetches complete tasks before pasting or duplicating a partial block. Removing a kanban column explicitly removes its hidden cards.

Manual IP ban requests also accept `forever: true`, for example `{ "ip": "192.0.2.123", "reason": "Verified malicious source", "forever": true }`. The default remains a 60-minute temporary ban. `durationMinutes`, when supplied, must still be between 1 and 43,200. Permanent bans use the UTC maximum timestamp (`9999-12-31T23:59:59.9999999Z`) in the existing `bannedUntil` column; they survive retention cleanup and remain active until explicitly released. The admin UI displays “Banned forever”. No database migration is required.
