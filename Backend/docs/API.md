# NodexMesh API — Reference

Complete contract for `NodexMeshApi`. This document is self-contained: it has every
endpoint, every request/response model, and the exact JSON shape of all 20 board-item
types. It is written to be handed to an AI (or a developer) to generate a typed HTTP
client without needing to read the C# source.

- **Base URL**: `{origin}/api/v1`
- **Content type**: `application/json` on every request and response.
- **Property naming**: `camelCase` throughout.

---

## 1. Rules the client MUST follow

These four will silently break things if missed.

### 1.1 Revisions are STRINGS, not numbers

Every `revision` / `expectedRevision` / `expectedBoardRevision` field crosses the wire as a
decimal **string** (`"42"`, not `42`). They're `Int64` server-side and would lose precision
past 2^53 as a JS number. The existing frontend already types this as
`export type Revision = string` in `records.ts` — keep it that way and never `parseInt`
them for arithmetic; treat them as opaque tokens you echo back.

### 1.2 `X-Requested-With: nodexmesh-web` on every request

`POST /auth/refresh` authenticates purely by cookie and **rejects any request without this
header** (401). It's the CSRF guard: a cross-site `<form>` POST can't set custom headers, so
requiring one forces a CORS preflight that fails for unlisted origins. Simplest approach is
to set it as a default header on the whole client.

### 1.3 `credentials: 'include'`

The refresh token lives in an `httpOnly` cookie scoped to `/api/v1/auth`. Without this flag
the browser won't send it and refresh will always 401.

### 1.4 The access token is memory-only

`POST /auth/login` returns `accessToken` in the JSON body. Hold it **in memory only** —
never `localStorage` or `sessionStorage`, or XSS can steal it. It expires in 15 minutes;
call `/auth/refresh` to get a new one. The refresh token itself is never visible to JS.

---

## 2. Authentication flow

```
register → login → (accessToken in memory, refresh cookie set)
              ↓
        Authorization: Bearer {accessToken} on all other calls
              ↓
        401 → POST /auth/refresh → new accessToken → retry original request
              ↓
        refresh 401 → session is dead, redirect to login
```

**Refresh-token rotation**: each refresh consumes the old token and issues a new one. If a
token that was already used is presented again, the server treats it as theft and revokes
**every** active token for that user — so never fire two refreshes concurrently. Queue
in-flight requests behind a single refresh promise.

---

## 3. Error format

All errors are RFC 7807 ProblemDetails:

```json
{
  "type": "https://httpstatuses.io/422",
  "title": "invalid_item",
  "status": 422,
  "detail": "Invalid kanban content or geometry."
}
```

`title` is the stable machine-readable code — switch on it, not on `detail`.

| Status | `title` codes | Meaning |
|---|---|---|
| 400 | (validation problem) | DataAnnotations failure — shape differs, see §3.1 |
| 401 | — | Missing/expired access token, or failed refresh |
| 403 | `forbidden` | Authenticated, has access, but role too low |
| 404 | `not_found` | Doesn't exist **or** caller has no access at all (deliberate — see §5) |
| 409 | `revision_mismatch` | Optimistic concurrency failure; refetch and merge |
| 409 | `idempotency_conflict` | Same `clientMutationId` reused with a different body |
| 422 | `unsupported_schema` | Unknown item type or `schemaVersion != 1` — client is outdated |
| 422 | `invalid_item` | Item content, geometry, or URL failed validation |
| 422 | `invalid_parent` | Illegal column nesting |
| 422 | `invalid_frame` | Illegal frame membership |
| 422 | `invalid_link` | Illegal item link |
| 422 | `invalid_scope` | Item's `boardId` doesn't match the route |
| 422 | `board_limit` | Board exceeds 20,000 items |
| 422 | `invalid_comment` | Unknown comment status |
| 422 | `invalid_member` | Cannot add the owner as a member |
| 429 | — | Rate limited; honour the `Retry-After` header |

### 3.1 Validation errors (400)

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": { "Password": ["Password must contain a digit."] }
}
```

---

## 4. Rate limits

| Scope | Limit | Applies to |
|---|---|---|
| Global | 300/min per user (or per IP if anonymous) | everything |
| `auth-strict` | 5/min per IP | register, login, revoke |
| `auth-refresh` | 30/min per IP (token bucket) | refresh |
| `board-mutation` | 60/min per user | `POST /boards/{id}/mutations` |

429 responses carry `Retry-After: 60` and `{"error": "Too many requests. Please try again later."}`.

The 60/min mutation limit matters for the save queue: with a 500 ms debounce you could
theoretically emit 120/min. Either raise the debounce or coalesce pending batches.

---

## 5. Permission model

`Owner (100) > Editor (75) > Commenter (50) > Viewer (25) > None (0)`

Roles are per-project and returned as strings on `ProjectRecord.role`. They are **not** in
the JWT — the server rechecks on every request, so a revoked collaborator loses access
immediately rather than when their token expires.

**404 vs 403**: no access at all returns **404**, so the API can't be used to probe which
project IDs exist. Insufficient-but-existing access returns a real 403. The client should
treat 404 on a project route as "gone or never yours" and drop it from local state.

> `Commenter` currently has no endpoint that requires exactly it — comments are written
> through the board mutation endpoint, which needs `Editor`. Treat `Commenter` as
> equivalent to `Viewer` until a dedicated comments endpoint exists.

---

## 6. Endpoints

### 6.1 Auth

#### `POST /api/v1/auth/register` — anonymous

```ts
// Request
{ email: string; password: string; confirmPassword: string; displayName?: string }
```

Password rules: ≥12 chars, with an uppercase, a lowercase, a digit and a special character.
`password` must equal `confirmPassword`.

```ts
// 201 Created
{ id: string /* uuid */; email: string }
```

`409` returns `{ "error": "Unable to register with the provided details." }` — deliberately
generic, so don't surface it as "email already taken".

---

#### `POST /api/v1/auth/login` — anonymous

```ts
// Request
{ email: string; password: string }

// 200 OK — also sets the httpOnly refresh cookie
{ accessToken: string; expiresAtUtc: string /* ISO 8601 */ }
```

`401` on bad credentials, unknown email, **or lockout** — all identical, by design. After 5
failed attempts the account locks for 15 minutes; you can't distinguish this, so show a
generic message plus a "too many attempts?" hint.

---

#### `POST /api/v1/auth/refresh` — cookie only

No request body. **Requires `X-Requested-With: nodexmesh-web`.**

```ts
// 200 OK — rotates the cookie
{ accessToken: string; expiresAtUtc: string }
```

`401` means the session is unrecoverable — clear state and redirect to login.

---

#### `POST /api/v1/auth/revoke` — authenticated

No body. Always `204`, whether or not a token existed. Call on logout.

---

### 6.2 Projects

#### `GET /api/v1/projects` — authenticated

Returns owned **and** shared projects, newest-updated first. Trashed projects are excluded.

```ts
// 200 OK
ProjectRecord[]
```

#### `POST /api/v1/projects`

```ts
// Request
{ name: string /* ≤200 */; color?: string /* "#RRGGBB", default "#7C3AED" */ }

// 200 OK
ProjectRecord
```

Also creates the project's single default board (`name: "Board"`). Fetch
`GET /projects/{id}/boards` to get its id.

#### `GET /api/v1/projects/{projectId}` — Viewer+

Returns `ProjectRecord`.

#### `PATCH /api/v1/projects/{projectId}` — Editor+

```ts
// Request — omitted fields are left unchanged
{ name?: string; color?: string; expectedRevision: string }

// 200 OK
ProjectRecord
```

`409 revision_mismatch` if stale — refetch and retry.

#### `DELETE /api/v1/projects/{projectId}` — Owner only

Soft delete (trash bin). `204`. The project disappears from `GET /projects`.

#### `POST /api/v1/projects/{projectId}/restore` — Owner only

Restores from trash. `204`.

> There is no endpoint to list trashed projects or to permanently delete. Both are needed
> for a working trash UI — flagging rather than inventing a shape you'd have to redo.

---

### 6.3 Sharing

#### `GET /api/v1/projects/{projectId}/members` — Viewer+

```ts
// 200 OK
ProjectMember[]
```

Does **not** include the owner (ownership is implicit). Use `ProjectRecord.ownerId`.

#### `POST /api/v1/projects/{projectId}/members` — Owner only

```ts
// Request
{ email: string; role: "Editor" | "Commenter" | "Viewer" }

// 200 OK
ProjectMember
```

Re-inviting an existing member updates their role. `"Owner"` is rejected (400).
Inviting yourself → `422 invalid_member`.
Unknown email → `404 { "error": "Unable to share with the provided details." }` — generic to
prevent probing which addresses are registered, so show it as-is.

#### `PATCH /api/v1/projects/{projectId}/members/{userId}` — Owner only

```ts
{ role: "Editor" | "Commenter" | "Viewer" }   // → 204
```

#### `DELETE /api/v1/projects/{projectId}/members/{userId}`

Owner may remove anyone; a member may remove **themselves** (leave the project). `204`.

---

### 6.4 Board

#### `GET /api/v1/projects/{projectId}/boards` — Viewer+

```ts
// 200 OK
BoardRecord[]
```

#### `GET /api/v1/boards/{boardId}` — Viewer+

The full board in one call. This is what you load on project open.

```ts
// 200 OK
BoardSnapshot
```

#### `POST /api/v1/boards/{boardId}/mutations` — **Editor+**

The only write path for canvas data. See §8 for the full protocol.

```ts
// Request
BoardMutation

// 200 OK
BoardMutationResult          // conflicts: []

// 409 Conflict — same shape
BoardMutationResult          // conflicts: [...], items: []
```

---

### 6.5 Appearance

#### `GET /api/v1/appearance` — authenticated

Returns the caller's theme settings in **exactly** the shape the frontend already uses, so
it can be dropped straight into the existing ThemeProvider.

```ts
// 200 OK
{
  defaults: { font: string; light: ThemePalette; dark: ThemePalette };
  projects: Record<string /* projectId */, {
    font: string | null;
    light: ThemePalette | null;   // null = inherit from defaults
    dark: ThemePalette | null;
  }>;
  uiFont: string;
  uiPrimary: string;
  uiSecondary: string;
  inheritanceVersion: number;
  paletteVersion: number;
}
```

Project overrides for projects the caller can no longer access are filtered out.

#### `PUT /api/v1/appearance` — authenticated

```ts
// Request — full replace, all fields required
{
  font: string; uiFont: string; uiPrimary: string; uiSecondary: string;
  inheritanceVersion: number; paletteVersion: number;
  light: ThemePalette; dark: ThemePalette;
}   // → 204
```

#### `PUT /api/v1/projects/{projectId}/appearance` — **Viewer+**

A per-user private preference, not a shared project change — hence Viewer, not Editor.

```ts
// Request — null means "inherit from defaults"
{ font: string | null; light: ThemePalette | null; dark: ThemePalette | null }   // → 204
```

#### `GET /health` — anonymous

```ts
{ status: "healthy", timeUtc: string }
```

---

## 7. Models

```ts
type Uuid = string;
type Iso = string;        // ISO 8601
type Revision = string;   // decimal string — see §1.1

type ProjectRole = "Owner" | "Editor" | "Commenter" | "Viewer";

interface ProjectRecord {
  id: Uuid;
  ownerId: Uuid;
  name: string;
  color: string | null;
  revision: Revision;
  createdAt: Iso;
  updatedAt: Iso;
  createdBy: Uuid | null;
  updatedBy: Uuid | null;
  deletedAt: Iso | null;
  role: ProjectRole;        // the CALLING user's role — not a property of the project
}

interface ProjectMember {
  userId: Uuid;
  email: string;
  displayName: string | null;
  role: "Editor" | "Commenter" | "Viewer";
  createdAt: Iso;
}

interface BoardRecord {
  id: Uuid;
  projectId: Uuid;
  name: string;
  sortOrder: number;
  revision: Revision;
  createdAt: Iso;
  updatedAt: Iso;
  createdBy: Uuid | null;
  updatedBy: Uuid | null;
  deletedAt: Iso | null;
}

interface ItemRecord {
  id: Uuid;
  boardId: Uuid;
  parentItemId: Uuid | null;
  frameId: Uuid | null;
  sortOrder: number;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  zIndex: number;
  locked: boolean;
  type: BoardItemType;
  schemaVersion: 1;
  appearance: ItemAppearance;
  data: ItemData;           // discriminated by `type` — see §9
  revision: Revision;
  createdAt: Iso;
  updatedAt: Iso;
  createdBy: Uuid | null;
  updatedBy: Uuid | null;
  deletedAt: Iso | null;
}

interface ItemLink {
  sourceItemId: Uuid;
  targetItemId: Uuid;
  kind: "line_start" | "line_end" | "created_from";
}

type CommentStatus = "open" | "todo" | "in-progress" | "resolved";

interface CommentRecord {
  id: Uuid;
  itemId: Uuid;
  text: string;
  status: CommentStatus;
  revision: Revision;
  createdAt: Iso;
  updatedAt: Iso;
  createdBy: Uuid | null;
  updatedBy: Uuid | null;
  deletedAt: Iso | null;
}

interface TagRecord {
  id: Uuid;
  projectId: Uuid;
  name: string;
  normalizedName: string;
}

interface BoardSnapshot {
  board: BoardRecord;
  items: ItemRecord[];
  links: ItemLink[];
  comments: CommentRecord[];
  tags: TagRecord[];
  itemTags: { itemId: Uuid; tagId: Uuid }[];
}

interface ThemePalette {
  primary: string;
  secondary: string;
  canvas: string;
  default: string;
  accent1: string; accent2: string; accent3: string; accent4: string; accent5: string;
  gradients: Record<string, { from: string; to: string; angle: number; kind: "linear" | "radial" }>;
}
```

### Appearance (shared by every item type)

```ts
interface ItemAppearance {
  color?: string;
  colorRole?: "default" | "accent1" | "accent2" | "accent3" | "accent4" | "accent5";
  gradient?: { from: string; to: string; kind: "linear" | "radial"; angle: number };
  topColor?: string;
  typography?: {
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    textAlign?: "left" | "center" | "right";
    verticalAlign?: "top" | "middle" | "bottom";
  };
  textAlign?: "left" | "center" | "right";
  fontSize?: "sm" | "base" | "lg";
  bold?: boolean;
  italic?: boolean;
}
```

---

## 8. The mutation protocol

### Request

```ts
interface BoardMutation {
  clientMutationId: Uuid;          // NEW uuid per logical batch; REUSE it on retry
  expectedBoardRevision: Revision;
  upserts: ItemMutation[];
  deletes: { id: Uuid; expectedRevision: Revision }[];
}

interface ItemMutation {
  item: ItemWrite;
  expectedRevision: Revision | null;   // null = INSERT; a value = UPDATE
  links: ItemLink[];                   // FULL replacement for this item
  comments: { id: Uuid; text: string; status: CommentStatus }[];  // FULL replacement
  tags: Uuid[];                        // FULL replacement
}

// ItemWrite = ItemRecord minus all audit fields
interface ItemWrite {
  id: Uuid; boardId: Uuid; parentItemId: Uuid | null; frameId: Uuid | null;
  sortOrder: number; x: number; y: number;
  width: number | null; height: number | null;
  zIndex: number; locked: boolean;
  type: BoardItemType; schemaVersion: 1;
  appearance: ItemAppearance; data: ItemData;
}
```

### Response

```ts
interface BoardMutationResult {
  boardRevision: Revision;     // new revision on success; CURRENT revision on 409
  items: ItemRecord[];         // written items with fresh revisions (empty on 409)
  conflicts: Conflict[];       // empty on success
}

interface Conflict {
  id: Uuid;                          // item id, or the BOARD id if the board itself was stale
  currentRevision: Revision | null;  // null when the item no longer exists
  reason: "revision_mismatch" | "not_found";
}
```

### Client rules

1. **`links`, `comments` and `tags` are full replacements** for the touched item. Sending
   `links: []` deletes all of that item's links. Always send the complete desired set.
2. **`expectedRevision: null` means insert.** If the ID already exists you get a conflict.
   For updates, send the revision you last received.
3. **Reuse `clientMutationId` when retrying the same batch.** That's what makes retries
   safe after a network timeout — the server replays the original response instead of
   applying twice. Use a **new** id for a new batch. Reusing one with a *different* body
   is rejected with `409 idempotency_conflict`. Keys expire after 24h.
4. **Conflicts are all-or-nothing.** If any item conflicts, *nothing* is applied and every
   conflict is returned at once. Refetch the snapshot (or just the conflicting items),
   merge, and resubmit with a **new** `clientMutationId`.
5. **Batch cap: 2,000 changes** (upserts + deletes). Split larger saves.
6. **Deletes are soft** — items come back with `deletedAt` set, not removed.

### Conflict handling sketch

```ts
const res = await post(`/boards/${boardId}/mutations`, mutation);
if (res.status === 409) {
  const { conflicts, boardRevision } = res.body;
  const snapshot = await get(`/boards/${boardId}`);   // re-sync
  // resolve against `snapshot`, then resubmit with a NEW clientMutationId
}
```

---

## 9. Board item types

20 types. `data` is discriminated by `type`. Unknown properties are **rejected** (422) —
send exactly these fields, nothing extra.

```ts
type BoardItemType =
  | "section-title" | "note" | "text" | "document" | "code" | "icon" | "image"
  | "link" | "embed" | "checklist" | "kanban" | "timeline" | "column" | "frame"
  | "dispenser" | "line" | "drawing" | "mindmap" | "diagram" | "database";

interface Entry { id: string; text: string; done: boolean }
interface Position { x: number; y: number }
interface GeoPoint { x: number; y: number; pressure?: number }
```

| `type` | `data` shape |
|---|---|
| `section-title` | `{ content: string }` |
| `note` | `{ content: string }` |
| `text` | `{ content: string; size: "sm"\|"md"\|"lg"\|"xl" }` |
| `document` | `{ title: string; content: string; contentFormat: "tiptap-html"; contentVersion: 1; autoHeight?: boolean }` |
| `code` | `{ content: string; language: string; autoHeight?: boolean }` |
| `icon` | `{ iconMode: "preset"\|"emoji"\|"svg"\|"url"; source: string; label: string }` |
| `image` | `{ url: string; caption: string; variant?: "card"\|"sticker"; imgHeight?: number }` |
| `link` | `{ url: string; title: string; description: string }` |
| `embed` | `{ url: string; title: string; showLabel: boolean }` |
| `checklist` | `{ title: string; entries: Entry[] }` |
| `kanban` | `{ title: string; columns: { id: string; title: string; color: string; width?: number; cards: Entry[] }[] }` |
| `timeline` | `{ title: string; mode: "simple"\|"schedule"; taskColumnWidth?: number; tasks: TimelineTask[] }` |
| `column` | `{ title: string; layout?: "vertical"\|"horizontal"\|"grid"; gridColumns?: number; gap?: number }` |
| `frame` | `{ title: string; opacity?: number }` |
| `dispenser` | `{ title: string }` |
| `line` | `LineData` (below) |
| `drawing` | `DrawingData` (below) |
| `mindmap` | `MindmapData` (below) |
| `diagram` | `DiagramData` (below) |
| `database` | `DatabaseData` (below) |

```ts
interface TimelineTask {
  id: string; title: string;
  start: string;      // "YYYY-MM-DD" — strict, must round-trip
  end: string;
  done: boolean; color: string; checklist: Entry[];
}

interface LineData {
  x2: number; y2: number;
  arrowStart: boolean; arrowEnd: boolean;
  strokeWidth: number;
  curve?: number;
  lineCap?: "round" | "butt" | "square";
  label?: string;
  labelMode?: "horizontal" | "follow-line";
  labelOffset?: number;
  labelFontSize?: number;
  divider?: boolean;
}

interface DrawingData {
  points: GeoPoint[];
  viewWidth: number; viewHeight: number;
  strokeWidth: number;
  strokes?: {
    points: GeoPoint[];
    x: number; y: number; scaleX: number; scaleY: number;
    color: string; strokeWidth: number;
  }[];
}

interface MindmapData {
  title: string;
  layout: "horizontal" | "vertical";
  lineStyle: "curve" | "elbow" | "straight";
  lineWidth: number;              // 1–10
  dashed: boolean;
  nodes: {
    id: string; parentId: string | null; label: string;
    side: "negative" | "positive";
    branchColor: string; background: string; textColor: string;
  }[];
}

interface DiagramData {
  title: string;
  nodes: {
    id: string; position: Position; type: "shape";
    data: {
      label: string;
      shape: "process" | "decision" | "terminal" | "database" | "input" | "document" | "service";
      color: string;
    };
  }[];
  edges: {
    id: string; source: string; target: string;
    sourceHandle?: "top" | "bottom" | "left" | "right" | null;
    targetHandle?: "top" | "bottom" | "left" | "right" | null;
    label?: string;
    type?: "smoothstep" | "default" | "straight";
  }[];
}

interface DatabaseData {
  title: string;
  tables: {
    id: string; name: string; position: Position;
    fields: {
      id: string; name: string; dataType: string;
      primaryKey: boolean; nullable: boolean; unique: boolean;
      defaultValue: string;
    }[];
  }[];
  relations: {
    id: string; source: string; target: string;
    sourceField: string; targetField: string;
    cardinality: "1:1" | "1:N" | "N:1" | "N:N";
  }[];
}
```

---

## 10. Server-side validation

The server re-runs the frontend's `itemSchema.ts` / `boardValidation.ts` rules. Client
validation is UX; these are the enforced limits.

| Rule | Limit / constraint |
|---|---|
| Items per board | 20,000 |
| Bytes per item (`data` + `appearance`) | 2,000,000 |
| Changes per mutation batch | 2,000 |
| Text field length | 200,000 chars |
| Numeric fields | finite, `abs(v) ≤ 10,000,000` |
| `width` / `height` | `null` or strictly `> 0` |
| `zIndex` | integer |
| `sortOrder` | safe integer |
| URLs (`image`, `link`, `embed`) | `http:`/`https:` only, ≤4096 chars, no `user:pass@` |
| Dates (`timeline.tasks[].start/end`) | strict `YYYY-MM-DD` |
| `schemaVersion` | must be `1` |
| Unknown JSON properties | rejected |

**Nesting**: `parentItemId` may only be set when the item type is one of
`note, text, document, code, image, link, embed, checklist`, **and** the parent is a
`column` that is itself top-level. One level of nesting only.

**Frames**: `frameId` must reference an item of type `frame`, and can't be the item itself.

**Links**: at most one link per `(sourceItemId, kind)`. `line_start`/`line_end` require
`source.type === "line"`; `created_from` requires `source.type === "note"` and
`target.type === "dispenser"`. Self-links are rejected.

---

## 11. Suggested client structure

```
src/shared/api/
├── httpClient.ts      fetch wrapper: base URL, default headers, credentials, 401→refresh
├── authApi.ts         register, login, refresh, revoke
├── projectsApi.ts     projects CRUD + members
├── boardApi.ts        snapshot + mutations
├── appearanceApi.ts   get/put appearance
└── types.ts           the models above
```

`httpClient.ts` should own:

- `X-Requested-With: nodexmesh-web` and `credentials: 'include'` as defaults (§1.2, §1.3)
- the in-memory access token and `Authorization` header
- a **single-flight** refresh on 401: one refresh promise, all concurrent 401s await it,
  then retry. Parallel refreshes trigger the reuse-detection and nuke the session.
- ProblemDetails → typed error mapping via the `title` code (§3)
- `Retry-After` handling for 429

The existing `pendingChanges.ts` and `workspaceController.ts` already implement the
debounce/queue/retry layer — the mutation endpoint is designed to slot in underneath them,
with `clientMutationId` carrying the idempotency guarantee those retries assume.
