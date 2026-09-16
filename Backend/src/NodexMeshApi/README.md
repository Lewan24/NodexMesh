# NodexMeshApi — first preview

A .NET 10 minimal API for NodexMesh: PostgreSQL + EF Core, JWT access tokens with rotating
refresh-token cookies, and per-project collaboration roles. Built on the security patterns
from your SampleWarehouseApi template (rate limiting, refresh rotation with reuse detection,
generic auth errors, security headers, deny-by-default CORS).

## Files

```
NodexMeshApi/
├── Program.cs                          composition root, rate limits, CORS, pipeline
├── NodexMeshApi.csproj
├── appsettings.json                    no secrets — Jwt:Key via user-secrets / env
├── Common/Common.cs                    ProjectRole, ApiException, exception handler, security headers
├── Data/AppDbContext.cs                full Fluent API config, query filters, check constraints
├── Models/
│   ├── Identity.cs                     ApplicationUser, RefreshToken
│   ├── Project.cs                      Project, ProjectMember
│   ├── Board.cs                        Board, BoardItem
│   ├── BoardItemData.cs                the 20 per-type Data records + strict deserialization
│   ├── BoardRelations.cs               ItemLink, Tag, ItemTag
│   ├── Comment.cs                      Comment + CommentStatus
│   └── Appearance.cs                   AppearanceProfile, ProjectAppearanceOverride, IdempotencyKey
├── Dtos/
│   ├── AuthDtos.cs
│   ├── BoardDtos.cs                    wire contract + revision-as-string converters
│   └── ProjectDtos.cs
├── Services/
│   ├── TokenService.cs
│   ├── ProjectAccessService.cs         the single authorization choke point
│   ├── BoardValidator.cs               port of itemSchema.ts + boardValidation.ts
│   └── BoardMutationService.cs         transactional batch apply
├── Endpoints/
│   ├── AuthEndpoints.cs
│   ├── ProjectEndpoints.cs             CRUD, trash/restore, members
│   └── BoardEndpoints.cs               snapshot, mutations, appearance
└── OpenApi/BearerSecuritySchemeTransformer.cs
```

## Running

```bash
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
dotnet user-secrets set "ConnectionStrings:Default" \
  "Host=localhost;Port=5432;Database=nodexmesh;Username=nodexmesh_app;Password=..."

dotnet ef migrations add InitialCreate
dotnet run
```

Scalar UI at `/scalar/v1` in Development.

## Endpoints

| Method | Path | Min. role |
|---|---|---|
| POST | `/api/v1/auth/register` \| `/login` \| `/refresh` \| `/revoke` | — |
| GET | `/api/v1/projects` | — (returns owned + shared) |
| POST | `/api/v1/projects` | — |
| GET/PATCH | `/api/v1/projects/{id}` | Viewer / Editor |
| DELETE | `/api/v1/projects/{id}` (trash) | Owner |
| POST | `/api/v1/projects/{id}/restore` | Owner |
| GET/POST | `/api/v1/projects/{id}/members` | Viewer / Owner |
| PATCH/DELETE | `/api/v1/projects/{id}/members/{userId}` | Owner (or self, to leave) |
| GET | `/api/v1/boards/{id}` (full snapshot) | Viewer |
| POST | `/api/v1/boards/{id}/mutations` | **Editor** |
| GET/PUT | `/api/v1/appearance` | — (own profile) |
| PUT | `/api/v1/projects/{id}/appearance` | Viewer (private preference) |

## Permission model

`ProjectRole`: `Owner (100) > Editor (75) > Commenter (50) > Viewer (25) > None (0)`.

Owner is implicit from `Project.OwnerId` and never stored in `project_members` — you can't
grant it by invite, which keeps "transfer ownership" a deliberate, separate operation
(not built yet, see open questions).

Roles are **not** in the JWT. `ProjectAccessService` reads `project_members` on every
request, so removing a collaborator takes effect on their next call rather than up to 15
minutes later when their access token expires. The cost is one small indexed query per
request — worth it for revocation that actually works.

`Commenter` currently sits between Viewer and Editor but no endpoint requires exactly it —
comments ride along inside `ItemMutation`, which needs Editor. Splitting comments into their
own endpoint would make the role meaningful; flagged below.

## The mutation endpoint

`POST /api/v1/boards/{id}/mutations` is the only write path for canvas data, matching
`BoardMutation` in your `records.ts`. Order of operations:

1. **Idempotency** — `clientMutationId` looked up first; a replay returns the stored
   response without touching the DB. Same key + different body ⇒ `409 idempotency_conflict`
   rather than silently applying.
2. **Authorization** — Editor or above on the owning project.
3. Transaction opens; `boards.revision` must equal `expectedBoardRevision`.
4. **All conflicts collected before anything is written** — so a batch where item 7 of 50 is
   stale returns every conflict at once instead of failing item-by-item across retries.
5. Validation against the referenced subgraph (touched items + their parents, frames, and
   link endpoints), not all 20k rows.
6. Apply: items upserted with `revision += 1`; deletes are soft; links/tags/comments
   **replaced** per touched item, per the note in `records.ts`.
7. Board revision bumped, response cached under the idempotency key, commit.

Conflicts return `409` with each item's current server-side revision so `SaveStatus.tsx` can
reconcile.

## Security notes

- **Revisions cross the wire as strings.** `records.ts` says so explicitly; a JSON number
  would lose precision past 2^53. `RevisionJsonConverter` handles it on every DTO.
- **Strict JSON deserialization** (`UnmappedMemberHandling.Disallow`) is the C# analogue of
  `itemSchema.ts`'s `object()` check, which only permits exactly the declared keys — this is
  the mass-assignment guard, so don't relax it.
- **URL fields are revalidated server-side** for `image`/`link`/`embed` (http/https only, no
  `user:pass@`). The frontend checks this too, but client validation is UX, not a control —
  `javascript:` and `data:` URIs must never reach the DB, since the SPA renders them into
  `<img>`/`<iframe>`.
- **Soft-delete query filters** are global, so a forgotten `.Where(DeletedAt == null)` can't
  leak trashed data. `RestoreAsync` is the one place using `IgnoreQueryFilters()`, and it
  re-checks ownership by hand because `ProjectAccessService` (correctly) can't see trashed rows.
- **404 vs 403**: no access at all ⇒ 404, so the API isn't an existence oracle for project
  IDs. Insufficient access ⇒ real 403, which leaks nothing they don't already know.
- **Invite by email, generic failure** — a distinct "no such user" would let any owner probe
  which addresses are registered.
- **Refresh-token reuse detection** kills the whole token family (carried over from your
  template).
- **`board-mutation` rate-limit policy** (60/min/user) sits well under the 300/min global
  limit — it's by far the heaviest write path.

## Deliberate gaps in this preview

These are real work items, not oversights I'm hiding:

- **No migrations committed.** `Program.cs` calls `MigrateAsync()`; you still need
  `dotnet ef migrations add InitialCreate`. I didn't use your template's `EnsureCreatedAsync`
  shortcut since this schema will change a lot.
- **`ValidateAgainstGraphAsync` does a `COUNT` per mutation** for the 20k board limit. Fine at
  current scale, but it's a per-save full count — cache it on the board row if boards get big.
- **No audit log.** OWASP A09 wants one for auth events, deletes, and role changes. I'd add
  `audit_log(id, user_id, action, entity_type, entity_id, ip, at, metadata jsonb)`.
- **No idempotency-key cleanup job.** The `expires_at` index is there; nothing prunes yet.
- **Real-time collaboration isn't addressed.** Your Future Plans mention SignalR. The mutation
  model supports it (revisions give you a change feed), but with multiple people on one board
  the 500 ms debounce will produce conflicts far more often than in single-user mode — worth
  thinking about whether you want last-write-wins per *item* (which this gives you) or true
  operational transform / CRDT merging. That's a significant design decision I'd want your
  input on before building further.
- **`DrawingData` has no point-count cap in C#.** `itemSchema.ts` allows 100,000 points per
  stroke; the 2 MB per-item byte cap is the only backstop. Probably fine, worth a look.

## Open questions

1. **Ownership transfer** — needed? Right now an owner can only trash a project, never hand
   it over.
2. **Should `Commenter` get its own comment endpoint?** Otherwise the role does nothing.
3. **Per-board vs per-project sharing** — I scoped sharing to the project, since the UI is
   one board per project today. If boards become independently shareable, `project_members`
   becomes `board_members` and `ProjectAccessService` changes shape.
4. **Postgres role setup** — the DDL assumes an app role without DDL rights and a separate
   migration role. Worth confirming that matches your Docker Compose plan.
