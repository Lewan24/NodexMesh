# NodexMeshApi — Security Review

Audit of the API against the **OWASP Top 10 (2021)** and **OWASP API Security Top 10 (2023)**.
Reflects the state after this pass.

**Scope note:** this is a code review, not a penetration test. Nothing here was verified
against a running instance — I had no .NET SDK available, so the project was not compiled
or executed. Treat "fixed" as "the code now does X", not "X was tested".

---

## Verdict

A solid foundation. Authentication, per-project authorization, input validation and rate
limiting are all genuinely well built — better than most projects at this stage, and the
access-control choke point in `ProjectAccessService` is the right architecture.

The gaps found were mostly **operational** (unbounded table growth, error-handling edges)
rather than exploitable authentication or authorization holes. I found **no way for one
user to read or modify another user's boards.**

The two things standing between this and production-grade are **audit logging** and
**secrets management**, both listed under "not addressed" below.

---

## OWASP Top 10 (2021)

### A01 — Broken Access Control ✅ strong

| Control | Where |
|---|---|
| Single authorization choke point | `ProjectAccessService.RequireAsync` / `RequireForBoardAsync` |
| Roles re-read per request, never trusted from the JWT | `ProjectAccessService` |
| 404-not-403 for no-access (no existence oracle) | `ProjectAccessService` |
| Soft-delete global query filters | `AppDbContext` — trashed rows can't leak via a forgotten `Where` |
| Non-enumerable UUIDv7 identifiers | throughout |
| Board→project resolution server-side | `RequireForBoardAsync` — client never asserts which project a board belongs to |

I traced every endpoint that accepts an ID from the client. All of them resolve ownership
server-side before reading or writing. **No IDOR found.**

**Fixed this pass:**

- **Member email harvesting.** `GET /projects/{id}/members` returned every collaborator's
  real email to any Viewer. On a board shared with a dozen people, each one got a
  harvestable address list. Emails are now masked (`a***e@example.com`) for everyone except
  the Owner and the caller's own row.
- **Share-link IDOR (new code).** `RevokeAsync` scopes by `projectId` *and* `linkId`, so an
  owner of project A can't revoke project B's link by id.
- **Cross-project board read (new code).** The public board endpoint requires the board to
  belong to the token's project, or a valid token for a small project would read any board
  in the database by id.

### A02 — Cryptographic Failures ✅ strong

- Refresh tokens and share tokens are stored as **SHA-256 hashes only**; the raw values are
  unrecoverable from the database. A backup leak yields no usable credentials.
- Share tokens: 256 bits of `RandomNumberGenerator` output, base64url-encoded.
- Passwords: ASP.NET Identity (PBKDF2, per-user salt).
- `Jwt:Key` must be ≥32 chars or the app refuses to start.
- Refresh token is `httpOnly` + `Secure` + path-scoped, so XSS can't read it; the access
  token is memory-only by contract.

**Worth upgrading later:** HMAC-SHA256 symmetric JWT signing means anything that can verify
a token can also mint one. Fine for a single self-hosted API. If you ever split into
multiple services, move to RS256/ES256 asymmetric keys so verifiers only hold the public key.

### A03 — Injection ✅ strong

- EF Core parameterizes everything; there is **no raw SQL anywhere** in the codebase.
- The `jsonb` columns are written as serialized strings through parameters, never
  interpolated.
- Strict JSON deserialization (`UnmappedMemberHandling.Disallow`) rejects unknown
  properties — this is the mass-assignment guard and should not be relaxed.
- Stored-XSS surface (`image`/`link`/`embed` URLs) is revalidated server-side: `http`/`https`
  only, no `user:pass@`, ≤4096 chars. `javascript:` and `data:` URIs cannot reach the DB.

**Caveat that is not a backend bug but matters:** `document` items store
`tiptap-html` — raw HTML authored by a user. The API stores it verbatim and correctly makes
no attempt to render it. **The frontend must sanitize on render** (DOMPurify or Tiptap's
own schema-restricted parser). With board sharing now live, an Editor on a shared project
can plant HTML that an Owner's browser will render — so this is a real cross-user XSS path
that only the client can close.

### A04 — Insecure Design ✅ good

- Idempotency keys make retries safe; reusing a key with a different body is rejected.
- Revision-based optimistic concurrency prevents silent last-write-wins.
- Conflicts are collected before any write — all-or-nothing, no partial application.
- Hard limits on items/board, bytes/item, changes/batch.

**Fixed this pass:** share links are Owner-only to mint. Allowing an Editor to publish would
mean inviting a collaborator implicitly grants them power to expose the board publicly.

### A05 — Security Misconfiguration ✅ good (several fixes)

- Deny-by-default CORS: no configured origins = no origins allowed.
- No secrets in source; `Jwt:Key` via user-secrets/env.
- Generic 500s; stack traces never reach the client.

**Fixed this pass:**

- **CSP had been globally weakened** to `frame-ancestors 'none'`, dropping
  `default-src 'none'`. Understandable — the strict policy breaks the Scalar docs UI. But
  it removed the strict policy from the API routes too. Now scoped: API routes get the full
  `default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`, docs
  get a narrower policy. Both are protected, Scalar still works.
- **No cache headers.** Authenticated JSON could be stored by intermediate proxies or the
  browser bfcache. Now `no-store` on authenticated API routes, `private, max-age=30` on the
  public share routes (anonymous and identical per viewer, so caching is safe and sheds load).
- **Server fingerprinting.** `AddServerHeader = false` plus stripping any `Server` header a
  proxy adds.
- Added `X-Permitted-Cross-Domain-Policies: none`.
- **Slowloris.** Added `RequestHeadersTimeout`, `KeepAliveTimeout` and
  `MinRequestBodyDataRate` — without these a client can hold request slots open indefinitely
  by dribbling bytes.

### A06 — Vulnerable and Outdated Components ⚠️ process gap

Dependencies are current and minimal. There is no automated monitoring.

**Recommended:** enable Dependabot on the repo, and add `dotnet list package --vulnerable
--include-transitive` to CI as a failing step.

### A07 — Identification and Authentication Failures ✅ strong

- 12-char minimum with complexity; lockout after 5 attempts for 15 minutes.
- Uniformly generic auth responses — bad password, unknown email and locked-out are
  indistinguishable.
- Registration and invite-by-email both return generic failures (no user enumeration).
- Refresh-token rotation with **reuse detection**: replaying a consumed token revokes the
  entire family for that user.
- CSRF guard on `/auth/refresh` via a required custom header forcing a preflight.

**Fixed this pass:** `Guid.Parse(FindFirstValue(...)!)` threw on a token that authenticated
but carried a missing/malformed subject claim — surfacing as a **500 plus an error-log
entry that a caller could trigger at will** (log-flooding vector). Now returns 401 via
`ClaimsPrincipal.GetUserId()`.

**Not addressed:** no email verification, no password reset, no MFA. See roadmap.

### A08 — Software and Data Integrity Failures ✅ good

Revision concurrency tokens on projects, boards, items and comments. Idempotency keys
prevent duplicate application. No deserialization of untrusted binary formats.

### A09 — Security Logging and Monitoring Failures ❌ **the biggest remaining gap**

Serilog is wired up and auth failures are logged, but there is **no audit trail**. Today you
cannot answer:

- Who deleted this project?
- When was this collaborator added, and by whom?
- Who created the share link that leaked?
- Which account made these 400 mutations at 3am?

`CreatedBy`/`UpdatedBy` on rows give a partial answer, but they're overwritten on each
change — there's no history. This is the first thing I'd build next; see roadmap.

### A10 — Server-Side Request Forgery ✅ not applicable, correctly

The API never fetches user-supplied URLs. They're stored and validated, and rendering is
the client's job. **Keep it that way** — if you ever add server-side link previews or
image proxying, you'll need allowlisting plus private/link-local IP range blocking
(`10/8`, `172.16/12`, `192.168/16`, `169.254/16`, `127/8`, and the IPv6 equivalents),
re-checked *after* DNS resolution to avoid DNS-rebinding.

---

## API Security Top 10 (2023) — the ones that differ

| Risk | Status |
|---|---|
| API1 Broken Object Level Authorization | ✅ Every object access goes through `ProjectAccessService` |
| API2 Broken Authentication | ✅ See A07 |
| API3 Broken Object Property Level Authorization | ✅ Fixed — public DTOs strip user IDs; member emails masked |
| API4 Unrestricted Resource Consumption | ✅ Fixed — see below |
| API5 Broken Function Level Authorization | ✅ Role required per endpoint; `Commenter` is currently inert (see roadmap) |
| API6 Unrestricted Access to Sensitive Business Flows | ⚠️ Registration is open with no CAPTCHA/email verification |
| API7 SSRF | ✅ N/A |
| API8 Security Misconfiguration | ✅ Fixed — see A05 |
| API9 Improper Inventory Management | ✅ `/api/v1` versioned; OpenAPI dev-only |
| API10 Unsafe Consumption of Third-Party APIs | ✅ No outbound calls |

**API4 fixed this pass — unbounded table growth.** Three tables grew forever with nothing
deleting them:

- `idempotency_keys` — one row **per mutation batch**, storing the full response as `jsonb`.
  With a 500 ms save debounce this was the fastest-growing table in the schema, and rows
  are only useful for 24h.
- `refresh_tokens` — one row per login *and* per rotation (every ~15 min per active session).
- `project_share_links` — revoked links holding space in the unique token-hash index.

This is a slow availability problem, not just untidiness: disk fills, autovacuum falls
behind, and the token-hash lookup on the anonymous read path degrades. Added
`ExpiredDataCleanupService`, an hourly background job using batched `ExecuteDeleteAsync`.

Revoked refresh tokens are deliberately retained **7 days** — reuse detection needs to find
a revoked row to recognise replay. Deleting immediately would turn a stolen-token replay
into a silent "unknown token" instead of triggering family revocation.

---

## What was fixed, in one list

**Access control**
1. Member email addresses masked for non-owners
2. Share-link revocation scoped by project (IDOR)
3. Public board reads scoped to the token's project (IDOR)

**Availability**
4. `ExpiredDataCleanupService` for idempotency keys, refresh tokens, dead share links
5. Kestrel slowloris limits
6. Share-link access counter throttled to 1 write/min (write-amplification on an anonymous endpoint)
7. Per-IP rate limit on public share routes

**Hardening**
8. CSP strict again on API routes, scoped so Scalar still works
9. `Cache-Control: no-store` on authenticated routes
10. `Server` header suppressed; `X-Permitted-Cross-Domain-Policies` added
11. 401 instead of 500 on malformed subject claim (log-flooding)
12. `GlobalExceptionHandler`: `HasStarted` guard, `application/problem+json`, client
    disconnects no longer logged as errors
13. `HostAbortedException` excluded so `dotnet ef` commands don't log a false fatal

---

## Roadmap

### Do before exposing this to the internet

1. **Audit log** (A09). A single `audit_log` table — `id, user_id, action, entity_type,
   entity_id, ip, at, metadata jsonb` — written for: login success/failure, project
   create/trash/restore, member add/remove/role change, share-link create/revoke, and
   ownership transfer when it exists. Append-only, no update path, retained ~90 days.
   This is the gap I'd close first.

2. **Secrets management.** Env vars are fine for a hobby deploy, but they leak into
   `docker inspect`, process listings and crash dumps. Move to Docker secrets at minimum.

3. **Email verification on registration.** Right now anyone can register with an address
   they don't control — which matters specifically because **invites are by email**. Invite
   someone before they've verified and you could hand access to whoever registered that
   address first. This interacts directly with the sharing feature you just added.

4. **Password reset.** There's currently no recovery path at all. Token-based, single-use,
   short expiry, and the "email sent" response must be identical whether or not the account
   exists.

5. **Registration abuse control.** Open registration with no CAPTCHA and no email
   verification means trivial mass account creation (API6).

### Next tier

6. **Make `Commenter` mean something.** It currently sits between Viewer and Editor but no
   endpoint requires it — comments are written through the board mutation endpoint, which
   needs Editor. Either give comments their own endpoint or drop the role. Right now the UI
   would be promising something the API doesn't enforce.

7. **Ownership transfer.** An owner can only trash a project, never hand it over. If a user
   deletes their account, their projects become orphaned.

8. **Account deletion / GDPR export.** No way to delete an account or export data. If this
   is ever hosted for others in the EU, both are legal requirements.

9. **Trash management endpoints.** No way to list trashed projects or permanently delete —
   so soft-deleted projects accumulate forever and the trash UI can't be built.

10. **Structured security events + alerting.** Once the audit log exists, alert on
    lockout spikes, refresh-token reuse detections (that one means a token was stolen),
    and 403 bursts.

### Architectural, when you get there

11. **Real-time collaboration.** SignalR is on your roadmap. Note the security angle: the
    hub needs the *same* `ProjectAccessService` checks per connection **and** a re-check on
    role change, or a removed collaborator keeps receiving live updates over an open
    socket. Also, with multiple editors the 500 ms debounce will conflict far more often —
    last-write-wins per item (what you have) versus CRDT/OT is a design decision worth
    making deliberately.

12. **Distributed rate limiting.** The current limiter is in-memory, so limits are per
    instance. Behind more than one replica, move to Redis.

13. **Asymmetric JWT signing** (see A02) if the API is ever split into services.

14. **Database least privilege.** The app role should not own the schema. Run migrations as
    a separate elevated role and give the runtime role only DML.

---

## Two things the backend cannot fix

1. **HTML sanitization of `document` items.** The API stores `tiptap-html` verbatim, which
   is correct — but the frontend must sanitize on render. With sharing live, this is a
   cross-user XSS path.

2. **Share-link handling in the UI.** The token is a bearer credential in a URL. Don't put
   it in `document.title`, don't send it to analytics, and don't log it. `Referrer-Policy:
   no-referrer` is set server-side, which covers outbound links from a shared board.
