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
| POST    | `/auth/login`           | Anonymous; returns access token/profile and sets refresh cookie |
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
| POST         | `/boards/{boardId}/mutations`                       | Editor; transactional mutation protocol     |
| PUT          | `/boards/{boardId}/items/{itemId}/comments`         | Commenter; board revision + upserts/deletes |
| GET          | `/projects/{projectId}/item-trash`                  | Viewer                                      |
| POST         | `/projects/{projectId}/item-trash/{itemId}/restore` | Editor; optional target board/position      |
| DELETE       | `/projects/{projectId}/item-trash/{itemId}`         | Editor; permanently delete item             |
| DELETE       | `/projects/{projectId}/item-trash`                  | Editor; empty item trash                    |

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
