# HTTP API integration

The frontend uses `Backend/docs/API.md` as its API contract and defaults to HTTP.
The previous API readiness documents describe the earlier proposed contract; their
cookie-only authentication and nested board routes do not apply to this backend.

## Run locally

1. Start the backend and its PostgreSQL database using the backend README.
2. Run `npm install` and `npm run dev` in `Frontend`.
3. Register an account in the sign-in screen, then open or create a project.

Vite proxies `/api` to `http://localhost:5215`, the backend's HTTP launch profile.
The backend must run in Development, which accepts this HTTP proxy hop without
redirecting to HTTPS. Restart the backend after updating its middleware. A fresh
session's refresh request should return 401 and show login, not fail with a 307.
Set the shell variable `API_PROXY_TARGET` if your backend runs elsewhere.
`VITE_API_BASE_URL` defaults to `/api/v1`; production should route `/api` to the
backend through its reverse proxy. A cross-origin URL requires matching backend
CORS and cookie settings. No secrets belong in Vite environment variables.

Set `VITE_DATA_SOURCE=mock` to explicitly select the offline demo. HTTP mode never
falls back to mock data after a request fails and does not migrate local demo data.
Project JSON export/import remains available, subject to API validation limits.

## Behavior

- Login sends email/password. Registration sends email/password/confirmPassword.
- Access tokens stay in memory. Startup refresh and concurrent 401 recovery share
  one refresh operation. Logout calls revoke. Expired sessions return to sign-in.
- Requests send `credentials: include`, `X-Requested-With: nodexmesh-web`, and a
  bearer token when authenticated. Error codes come from ProblemDetails `title`.
  HTTP 429 prevents early retries according to `Retry-After`.
- Projects load their default boards separately. Creation adopts the server ID.
  Board saves send the mutation contract, then reload the authoritative snapshot.
  Retries preserve the mutation body and ID; revisions remain decimal strings.
  Mutations are paced at least 1.1 seconds apart. Conflicts retain local changes
  until the user chooses reload; there is no automatic conflict merge.
- New tag names are resolved through `POST /projects/{id}/tags` before board saves.
  Names are limited to 64 characters and deduplicated within a project; item saves
  assign server UUIDs, and removing a tag removes its item assignment.
- Appearance settings load and save through the appearance endpoints. Theme mode
  is a browser/UI preference because the API does not persist it.

## Backend limitations

- No trash listing or permanent deletion endpoint exists. Recently trashed projects
  can be restored during the current session; they disappear after a reload.
  Empty trash and demo reset are blocked in HTTP mode.
- No user administration endpoints exist. API accounts have no frontend admin role.
- Batches over 2,000 changes are rejected locally. They are not split automatically,
  because parent/frame/link references can require an atomic batch.
- Project creation has no idempotency key in this API. A received creation response
  is cached for board-load retries, but a lost creation response can leave a project
  on the server. Reload the project list before retrying an ambiguous creation.
- Sharing has no existing frontend UI; the API's project roles still govern writes.

## Validation

`npm test`, `npm run build`, and `npm run format:check` exercise the adapters and
existing application tests. HTTP contract tests use injected fetch responses;
connecting to a running database-backed server is a separate integration check.
