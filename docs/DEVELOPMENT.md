# Development guide

## Requirements

- .NET 10 SDK
- Node.js/npm compatible with the lockfile
- PostgreSQL 17 for the API and PostgreSQL-backed tests
- Docker/Compose if using the containerized stack

## Local setup

Configure the API with .NET user secrets or environment variables. A new database requires all four values below; the administrator password must satisfy the Identity policy and is never generated into logs.

```bash
dotnet user-secrets set --project Backend/src/NodexMeshApi "ConnectionStrings:Default" "Host=localhost;Port=5432;Database=nodexmesh;Username=nodexmesh_app;Password=..."
dotnet user-secrets set --project Backend/src/NodexMeshApi "Jwt:Key" "at-least-32-random-characters"
dotnet user-secrets set --project Backend/src/NodexMeshApi "Admin:Email" "admin@example.com"
dotnet user-secrets set --project Backend/src/NodexMeshApi "Admin:Password" "a-strong-bootstrap-password"
dotnet run --project Backend/src/NodexMeshApi --launch-profile http
```

Then start the frontend:

```bash
cd Frontend
npm install
npm run dev
```

Vite proxies `/api` and `/hubs` to `http://localhost:5215`. Set `API_PROXY_TARGET` before starting Vite to use another backend address. The API's Scalar/OpenAPI UI is available in Development only.

## Repository structure

```text
Backend/src/NodexMeshApi/
  Auditing/       audit capture, queries, detection, retention, console formatting
  Common/         roles, exceptions, transport and security middleware
  Data/           AppDbContext
  Dtos/           wire contracts
  Endpoints/      minimal API route groups
  Migrations/     committed EF Core migrations
  Models/         Identity and application entities/item data contracts
  Services/       authorization, mutation, sharing, library, tokens, collaboration

Backend/tests/NodexMeshApi.Tests/
  Auditing/ Endpoints/ Security/ Services/ Smoke/ Unit/

Frontend/src/
  app/            composition, theme provider, global styles
  entities/       board/project/user types and validation
  features/       auth, board, blocks, canvas, comments, library, projects, version
  layout/         app bar and tool sidebar
  shared/         API client, dialogs, i18n, shared hooks

Frontend/tests/   Node test-runner regression suite
docs/             maintained project documentation
```

The canvas does not call HTTP directly. UI hooks use `WorkspaceController`, which talks through matching mock or HTTP repository interfaces. `boardAdapter.ts` maps between the UI project model and normalized persisted records.

## Data modes and demo

HTTP is the default:

```dotenv
VITE_DATA_SOURCE=http
VITE_API_BASE_URL=/api/v1
```

Set `VITE_DATA_SOURCE=mock` for the offline demo. Mock projects are stored in `localStorage` under `nodexmesh_api_mock_v1_<userId>`. Mock accounts/sessions are illustrative and are not a security boundary. Server-only features are disabled.

The bundled demo project is [demoProject.json](../Frontend/src/entities/project/demoProject.json). To update it:

1. Export a complete project from the application.
2. Replace `Frontend/src/entities/project/demoProject.json` with the version 2 `nodexmesh-project` export.
3. Use portable HTTPS URLs, built-in icons/emoji, or embedded SVG. Do not leave `library://` references in the offline demo.
4. Run frontend formatting, tests, and build.

The public demo URL in the root README is intentionally permanent. Existing browser-local demo data is not overwritten until the user resets the demo.

## Import and export

Import accepts version 1 single-board and version 2 multi-board exports up to 20 MiB. Import remaps project, board, item, and comment identifiers while preserving internal relationships. Version 2 exports active boards, items, relations, tags, and comments; it excludes project trash, memberships, audit history, personal appearance defaults, and file bytes.

`library://<projectId>/<assetId>` references are references only. JSON export does not copy media, grant access, or create public links. A portable backup with files would require a separate archive format.

## Code quality and verification

Frontend formatting follows `Frontend/AGENTS.md` and the checked-in Prettier/EditorConfig settings.

```bash
cd Frontend
npm run format
npm run format:check
npm test
npm run build
```

```bash
dotnet test Backend/tests/NodexMeshApi.Tests -m:1
dotnet build Backend/src/NodexMeshApi --no-restore
dotnet ef migrations has-pending-model-changes --project Backend/src/NodexMeshApi --no-build
```

PostgreSQL-specific tests use `AUDIT_TEST_POSTGRES` and/or `NodexMesh_PersistenceTestConnection`. Point them only at a disposable database where the test user may create and drop schemas. Tests do not use application tables.

## Sidebar resizing and editor completion

Desktop toolbars start at 235px and can be resized from 160–400px by dragging the right edge. The focused resize separator supports Left/Right arrows (8px), Home, and double-click to restore the default. Appearance settings also provide a width slider and reset button. Width persists through the existing appearance save queue; mobile panels retain their responsive layout.

Diagram, database, and mind-map editors persist edits through their existing update handlers. Clicking the editor backdrop closes editing mode. Timeline editing exits when clicking outside its block; task and Kanban-column dialogs save their valid drafts on backdrop click. Inside-dialog clicks and nested dialogs do not trigger outside-block closure.

MFA tests cover RFC test vectors, expiry, replay, attempts, account lockout, purpose/user/stamp binding, recovery codes, enrollment, method changes, and session rotation. Frontend HTTP integration tests cover the two-stage login and session acceptance. Apply committed EF migrations before deploying the API and frontend together. Perform a real SMTP delivery and authenticator enrollment smoke test against the target deployment; test fixtures do not send live mail.

Authenticator enrollment displays a locally rendered, black-on-white QR code with a four-module quiet zone, plus the manual key and app link. QR regression tests decode the rendered SVG with an independent decoder to verify the provisioning URI. No external QR service receives MFA secrets.

## Workspace navigation

The app bar keeps project selection, project search, sharing, and account access visible. Live-update status stays visible in the app bar, including on mobile. Project tools (appearance, library, refresh, JSON import/export) are grouped under the ellipsis button. Account settings and administration remain in the account menu. On mobile, search occupies its own row.

Administration user rows show full, wrapping names and email addresses. Expand User actions to edit accounts, reset credentials or appearance, manage MFA, block accounts, or access the existing restore/deletion confirmations. Actions expand below the identity rather than overlapping it.

Opening an unloaded project shows a loading status instead of a partial read-only board. Loading failures retain a Retry button; validated snapshots and session caching still control when the board becomes available.

Checklist and kanban tasks retain the quick-add flow. Click a task title to open the shared editor;
Save task and clicking the backdrop commit changes and close only after the workspace save queue confirms
success. Close also saves; Cancel/Escape discards the open draft. Failed saves keep the dialog open and
allow retry through the workspace recovery path. Optional details include description,
project assignee, deadline, multiple categories, and simple done/undone subtasks. Previews show category color and
name, completed/total subtask counts, detail icons, and deadline. The category editor is available from
the task dialog and saves project-wide settings separately from task edits. Read-only inspection disables
editing. Custom categories are available to project editors without a subscription requirement.

Regression coverage: `Frontend/tests/rich-tasks.test.mjs`, rich-task cases in `BoardValidatorTests`,
project-category authorization/concurrency tests in `ProjectEndpointsTests`, and the existing completed-task
and cross-item drag suites.

The task dialog uses separate task-field and category-editor components. Category chips are keyboard-accessible
checkboxes. Categories can be created in the project editor and then selected on a task. Category loading errors
show a retry action. On phones the dialog is a scrollable bottom sheet with fixed actions, safe-area padding,
16px inputs, and visual-viewport resizing for the software keyboard; background page scrolling is locked.
Middle-button canvas panning is handled during capture so task titles, checkboxes, delete buttons, and drag handles
cannot block navigation. Dialog and menu controls are excluded from middle-button capture.

Task details remain open during persistence. If the server omits a completed task from a later partial board
response, saving its still-open dialog reloads completed task data before editing, preserves the partial-write
flag, and adjusts local progress counts. Removed tasks or columns show an error rather than being recreated.

Canvas tools: new Kanban boards default to 960px, with a larger implicit width for larger fonts. Auto-fit document/code heights round up to the 16px canvas grid; automatic growth moves subsequent items to grid-aligned rows. Document edits save while typing and finish when clicking outside the document. The desktop tools sidebar can toggle between labeled tiles and an accessible icon rail; tool dragging and category controls work in both modes. Mobile keeps the full sidebar and has no collapse control.

### Canvas viewport and task editing

The canvas percentage control offers zoom presets from 10% to 300%, preserving the
visible canvas center. Task titles and descriptions support multiple lines, grow
automatically up to a bounded height, and can also be resized vertically by dragging.
Longer content scrolls within the field; the dialog body remains scrollable.

Canvas pan and zoom are saved in browser local storage per signed-in user, project,
and board (`nodexmesh.viewport.v1.`). Returning from a nested board or reopening a
board restores its view. This preference stays in the current browser and does not
change shared project data or require an API migration. Writes are debounced and
flushed when changing boards, unmounting, or leaving the page. Invalid saved values
fall back to the default view; unavailable storage does not block canvas use.

## Frontend recovery and performance checks

Run `npm run lint`, `npm test`, `npm run build`, and `npm run format:check` from `Frontend`. Lint checks source TypeScript and React hook dependencies. `npm run benchmark:projection` prints median/p95 snapshot conversion measurements for 100, 500, and 2,000 annotated notes; timing is diagnostic rather than a CI pass/fail threshold.

The frontend uses asynchronous mock composition, so both HTTP and `VITE_DATA_SOURCE=mock` production bundles must build. Tests verify the HTTP entry's emitted static module graph excludes mock/demo implementations, and exercise mock login/demo loading. The import validator is intentionally loaded on demand; Vite-based tests that call imports keep the module runner open until test teardown.

Recovery boundaries isolate failed blocks/screens. Reload retries registered saves first and cancels if they fail or remain pending. Pending workspace/appearance saves remain guarded after unmount. These guards do not serialize local form drafts or uncommitted editor composition. See [FRONTEND_REVIEW.md](FRONTEND_REVIEW.md) for completed changes, tests, and remaining work.

The canvas model has a separate diagnostic benchmark: `npm run benchmark:canvas-model`. It compares the prior per-frame lock scans and separate navigation/highlight search passes with the current ownership propagation and unified search results, checking semantic equivalence before timing. Canvas model regression tests cover transient geometry, stable layering, memoization, ownership locks and grouped drag commits. The browser follow-up now profiles the real production Canvas and culls eligible simple blocks; stateful-editor culling remains future work.

## Browser FPS and interaction checks

See [BROWSER_PERFORMANCE.md](BROWSER_PERFORMANCE.md) for measurements, reproduction and retention policy. Install the Chromium test browser with `npx playwright install chromium`, then run `npm run test:browser` from `Frontend`. `npm run benchmark:browser` selects five frame profiles, including normal CPU speed and a pan-only case. [CAMERA_PERFORMANCE.md](CAMERA_PERFORMANCE.md) describes live camera ownership, navigation previews and the remaining 60 FPS plan. Do not run builds or other test suites concurrently with frame measurements. `npm run typecheck:browser` checks the isolated fixture and Playwright/Vite configuration.

The test server builds into `dist-performance` and serves only on loopback port 4178. The diagnostic control API is excluded from application bundles, with a regression assertion. Test data does not use a live account or saved workspace. `test-results` stores machine-readable reports, failure traces and optional CPU samples (`CANVAS_CPU_PROFILE=1`). These generated directories are ignored by Git. A custom browser install path must also be supplied when running tests via `PLAYWRIGHT_BROWSERS_PATH`.

The full application shell has a separate diagnostic: `npm run benchmark:workspace`. It uses isolated demo authentication/storage with the production App/BoardPage/BoardCanvas, profiles note and mixed boards through their mouse handlers, and measures visible-editor restoration plus subsequent frame times. `CANVAS_RENDER_TRACE=1` attaches compressed rendering traces and `CANVAS_CPU_PROFILE=1` attaches CPU samples for source-map attribution; `CANVAS_CPU_SLOWDOWN=1` selects normal CPU speed. See [WORKSPACE_RENDERING.md](WORKSPACE_RENDERING.md) for alternating comparisons, transport isolation, software-renderer limits and retained evidence.

Workspace navigation records project and board visits in browser session history. Mouse 4/5 move backward/forward within those visits, including for viewers, and stop at the ends of the workspace history. Restoring a visit uses the normal board loader and authorization checks; failed loads return to the previous history entry. Signing out removes the navigation listeners.

The default dark canvas is `#1F1F22` and the default dark card is `#25252A`. Registration, appearance reset and frontend fallback palettes share these values. Migration `20261022090000_UpdateDarkAppearanceDefaults` updates the previous default colors for existing users and project overrides while preserving custom colors and gradients. Browser-stored appearance preferences upgrade to palette version 3 as well.

Item borders are edited in Appearance, including for multiple selected items and items inside columns. Border settings persist with item appearance and can be included separately when copying/pasting styles. Project statuses are managed below Tags in the inspector; the status picker assigns or clears a single status for the whole selection. Viewers can inspect statuses but cannot change definitions or assignments.

Status definitions live in `projects.item_statuses` (migration `AddProjectItemStatuses`). Authenticated clients refresh definitions on focus and every 15 seconds while visible; saving a definition updates the current workspace immediately. The mock adapter stores definitions alongside project data. Archives carry definitions and remap status references on import. Pasting into another project discards unavailable status references.

Search supports status titles/descriptions as plain text, `status:done` (item statuses and the existing comment-status filter), `item-status:done` (item statuses only), and `comment-status:resolved` (comments only). Nested-column items participate in the same search results and highlighting.
