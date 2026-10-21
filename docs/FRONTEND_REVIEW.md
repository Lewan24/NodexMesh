# Frontend review and refactor plan

Reviewed on 2026-10-21 using the React, Vercel React performance, and feature architecture skills. Scope: application entry points, authentication, workspace orchestration, canvas rendering and geometry, block loading, library previews, history, styles, and existing validation. This is a code/build review, not a full browser UX, accessibility, or backend audit. See [PERFORMANCE.md](PERFORMANCE.md) for existing interaction guarantees and profiling scenarios.

## Changes made

- Lazy-load workspace, administration, profile, and public project views. Login no longer statically imports those screens. Use a translated, accessible loading status.
- Initialize authenticated view state from the user's role, and reset it when identity or role changes. Previously an admin initially mounted the workspace before an effect selected administration, potentially starting unnecessary workspace requests.
- Reuse the canvas item index for connection endpoints; build a memoized index for read-only boards. Endpoint lookup during full connection rendering changes from O(lines × items) to O(items + lines). Existing array-based callers remain compatible. Regression coverage compares measured geometry, missing targets, dividers, and unchanged identity across both lookup modes.
- Include collaboration locks in the memoized block content and resize-handler dependencies. Previously lock changes could leave callbacks using old permission state.
- Restore the missing ESLint flat configuration using installed dependencies: recommended JavaScript/TypeScript checks, hook call-order errors, and hook dependency warnings. Intentionally unused underscore names remain allowed. Resolve the small existing type/expression errors exposed by those checks. Tests and tooling configuration are not linted by this initial source-code configuration.

Production build evidence, same checkout/environment: entry JS decreased from 752.99 kB (214.85 kB gzip) to approximately 232.32 kB (73.30 kB gzip). These are individual chunk sizes, not total startup transfer or browser timing measurements. Shared ThemeProvider code remains about 451.62 kB (141.94 kB gzip); authenticated views incur their own loads. The build no longer reports chunks above 500 kB. Do not treat that threshold alone as a performance budget.

## Follow-up implementation (2026-10-21)

### Completed: demo portability and hook dependencies

The private image reference was replaced with the public OWASP diagram already referenced by the demo's security board. The duplicated GIF URL was corrected in both main-board projections. No import validation was weakened. Public HTTPS media still requires internet access; this is portability across installations, not a fully offline media archive.

All 13 remaining hook dependency warnings were resolved. Changes include stable presence publishing/cursor callbacks, cancellation checks for disposed connections and delayed text previews, stable column item references, primitive dialog/selection dependencies, current frame measurement callbacks, and stable administration loading with stale-result protection.

Project metadata now lives in `features/board/hooks/useProjectMetadata.ts`. It loads after the first persisted board snapshot and refreshes on project identity, remote revision, or an explicit sharing revision. Local save-status changes do not trigger metadata requests. Board-list and participant requests receive abort signals; obsolete results and mutations from the previously viewed project cannot replace the current board list.

### Completed: recovery boundaries and pending-save protection

Root, authenticated-screen, and individual block boundaries isolate render and deferred-module failures. Recovery text is translated; raw exception details are never rendered. Local retry remounts the failed content. A rejected cached lazy import can still require an explicit reload; there is no automatic reload loop.

Reload first retries and flushes registered pending saves. Failed saves cancel reload. Workspace and appearance guards survive an error-induced unmount while writes remain pending, retain `beforeunload` protection, and unregister after successful completion. A newly queued edit also blocks reload even if an earlier awaited save succeeded. Appearance recovery uses the existing save queue to serialize retries.

This protects persisted project/appearance changes already submitted to their stores. Unsaved local form drafts and an editor's uncommitted IME state are not serialized by error boundaries. Whole-screen recovery can remount those forms. Browser-native navigation can warn about pending registered writes but cannot await an asynchronous save.

### Completed: defer demo runtime and index board relations

HTTP startup no longer initializes mock authentication/workspace adapters. Mock composition is an asynchronous module loaded only for `VITE_DATA_SOURCE=mock`. Project-import validation still uses the mock persistence rules, but loads that validator on demand. Production graph tests verify that the HTTP entry's static imports exclude mock authentication, workspace, and demo data; mock bootstrap tests verify login, demo loading, and principal isolation. This is a loading-boundary improvement; feature-to-app dependency injection remains future work.

`toProjectView` now indexes comments, tags, and item-tag relations once, preserving source order, author/status data, nested ownership, deletion filtering, and independent projection arrays. It still validates every active item. Relation processing changes from repeated per-item scans to O(items + comments + tags + assignments), plus the existing O(items log items) sort.

Run `npm run benchmark:projection` from `Frontend` to reproduce the conversion benchmark. The sample uses notes with one comment and three tag assignments each, five warmups and 20 measured conversions. Same local Node environment, before/after medians:

| Items | Before    | After    |
| ----- | --------- | -------- |
| 100   | 1.34 ms   | 0.74 ms  |
| 500   | 16.60 ms  | 3.18 ms  |
| 2,000 | 219.28 ms | 11.06 ms |

At 2,000 items, observed p95 changed from 222.89 ms to 16.92 ms. These are synthetic Node conversion measurements, not browser rendering or network timings; hardware, GC, and concurrent work affect them. The benchmark intentionally has no timing assertion in CI.

The shared ThemeProvider chunk changed from about 451.62 kB to 67 kB minified after deferring mock composition. Chunk boundaries also changed elsewhere; this is not a total startup-transfer or page-load timing claim.

### Completed: canvas render model, search and frame ownership calculations

`useCanvasRenderModel` now owns memoized layer partitioning, transient geometry indexing, connection resolution and frame-lock derivation. The pure builders live in `canvasRenderModel.ts`. Persisted item objects remain unchanged; unaffected objects retain identity, and equal-z-index paint order stays stable. Frame locks depend on persisted items, so camera, drag-preview and measurement updates do not rebuild the ownership graph. Selection lookup also uses a memoized set instead of repeated array membership scans.

Frame locks propagate from locked items/column contents through owning frames in one traversal. This replaces repeated per-frame recursive board scans. Unlocking, deleting or reparenting contents immediately updates the result. Traversal terminates on cyclic ownership references and does not recurse through deep frame chains; this is defensive client handling, not permission to persist cycles. Existing schema/ownership validation is unchanged.

Drag capture indexes item identities and frame children once per gesture, and captures descendants iteratively. A selected nested frame is captured once alongside its ancestor. Gesture geometry remains transient until one batched final commit, including standalone line endpoints and one history boundary.

`getBoardSearchResult` now supplies navigation targets, top-level/nested highlights and direct containing-frame context together. Documents and nested content are no longer matched independently for navigation and highlighting, and frame context is derived without per-frame scans. Existing empty, text, tag and status query semantics are retained.

Run `npm run benchmark:canvas-model` from `Frontend`. It compares the previous calculations with the indexed/unified versions and asserts equivalent results before timing. Same local Node environment, five warmups and 20 measured runs, a mixture of notes/documents with one frame per ten items:

| Items / frames | Frame locks, before → after median | Search, before → after median |
| -------------- | ---------------------------------- | ----------------------------- |
| 100 / 10       | 0.026 → 0.019 ms                   | 0.633 → 0.213 ms              |
| 500 / 50       | 0.541 → 0.021 ms                   | 1.988 → 0.822 ms              |
| 2,000 / 200    | 6.173 → 0.077 ms                   | 8.863 → 3.667 ms              |

At 2,000 items, observed p95 was 7.134 → 0.138 ms for frame locks and 9.708 → 4.365 ms for search. These are synthetic calculation timings, not browser frame times. Frame-lock work is additionally skipped for camera/drag/measurement-only updates by memoization. No timing threshold is enforced in tests.

Regression tests cover stable layering, moved/removed connection endpoints, dividers, input immutability, nested-column locks, ownership changes, 10,000-level frame chains, cyclic input termination, query compatibility, memoized identities, and a nested-frame drag with one final commit/history step.

### Completed: browser frame pacing and simple-block culling

The FPS-focused follow-up adds a separate production-built Playwright fixture, CPU-throttled frame measurements and real-browser interaction regressions. With the corrected fixture and 4× CPU slowdown, the 1,000-note workload improved from 3.3 to 26.3 effective FPS; p95 frame interval changed from 416.7 to 66.7 ms, observed long tasks from 88 to 1, and mounted items at the end from 1,000 to 35. These are local diagnostic results, not a physical-phone benchmark or a 60 FPS guarantee. Earlier exploratory runs with incorrect fixture provider placement were discarded. The full protocol and raw comparison are in [BROWSER_PERFORMANCE.md](BROWSER_PERFORMANCE.md).

Memoized item/frame components, stable default props/resize callbacks, a single mobile-layout subscription and selective exact zoom remove camera-only leaf updates. Simple blocks outside 320 pixels of screen-space overscan are culled, with conservative bounds and source-aware remeasurement. Focused/composing editors, selected/dragged/remote-attended items, search matches and dialog targets stay mounted. Nested scrolling survives culling. Stateful editors, curves, frames, section titles and custom-CSS blocks are intentionally retained.

Overflow observation now batches all dirty roots on an animation frame, reads geometry before writing scroll attributes, ignores its own mutations and cancels work on unmount. The profile identified overflow layout reads as a remaining mount-time cost. Persistence and backend validation/authorization are unchanged. The diagnostic entry/control API has a separate build and an emitted-bundle exclusion test.

### Completed: live camera and navigation preview boundaries

`BoardCanvas` now owns persisted camera state below the board shell. The Canvas wrapper presents live scene/grid transforms independently of memoized content refreshes, with overscan safety and exact idle synchronization. Eligible fixed-height notes use readable previews during movement; active/focused, auto-sized and custom-styled content stays fully rendered. Live refs drive input conversion, zoom anchoring, inverse controls and cursor targets. The new comparison substantially reduces script work but does not demonstrate sustained 60 FPS. See [CAMERA_PERFORMANCE.md](CAMERA_PERFORMANCE.md) for matched measurements, limits, validation and the remaining renderer plan.

### Completed: full-shell traces and restoration measurement

The production App/BoardPage/camera path now has a separate isolated demo-backed benchmark with alternating before/after runs and rendering traces. Grid wrapping eliminates pan-driven dot-texture invalidation; offscreen overscan notes retain previews instead of mounting unnecessary editor controls. Visible editors restore sooner; the subsequent callback/retained-preview pass below addresses the measured post-restoration stalls. The renderer reports SwiftShader, so hardware-device conclusions remain open. See [WORKSPACE_RENDERING.md](WORKSPACE_RENDERING.md) for complete measurements, experiments rejected after testing, and validation.

### Completed: recovery callback stability and retained heavy previews

Measurement-dependent interaction callbacks now use stable event props backed by current committed handlers. This prevents measurement publication from invalidating every memoized editor while preserving fresh geometry and permissions. Columns, diagrams and databases retain their editor DOM/state behind bounded summaries during navigation/low zoom/offscreen rendering. Documents retain their normal rich-text renderer at all camera positions and zoom levels after a follow-up correction removed layout-changing summaries. Active editors, portals, selection/search/remote activity and custom styles stay fully rendered. Same-sized lazy loading placeholders now trigger a real-content measurement. Browser regressions verify state, scrolling, updates, geometry and interaction protection, including normal document formatting and dimensions sampled during navigation.

Four alternating comparisons removed mixed-board recovery long tasks (4 → 0), with recovery FPS 52.2 → 58.6. Movement FPS remained around 45 and first restoration was slightly slower; retained DOM increased. This is not proof of sustained 60 FPS, memory savings or deferred startup. See [WORKSPACE_RENDERING.md](WORKSPACE_RENDERING.md) and its raw follow-up results for the measured tradeoffs.

## Larger refactors: stage and measure before implementation

### P2: Split canvas orchestration and add selective rendering

`features/canvas/components/Canvas.tsx` still combines selection/navigation, drag/drop coordination, frame actions, dialogs and rendering. Render-model calculations and unified search results have been extracted. Eligible simple blocks now use viewport culling; stateful editors and other retained categories still mount offscreen.

1. Note and mixed-board production-browser studies are recorded, including connections, nested columns, documents, frames and graphs. Extend coverage to live remote presence and physical slower devices. Add retained-heap and compositor/memory analysis before broader culling.
2. Render-model calculations and unified search results are extracted and covered by regression tests. Continue separating selection/navigation and dialog composition while keeping state ownership and immutable item identities explicit.
3. Extract dialog/action composition and interaction coordination into focused hooks/components. Keep persistence and history boundaries explicit; avoid a single context carrying every camera update.
4. Simple-block culling, overscan, cached/source-aware measurements and activity retention are implemented. Extend to stateful editors only after preserving their drafts and view state in previews; retain crossing curves.
5. Profile again before introducing a spatial index or separate camera store.

Acceptance: fewer mounted nodes and lower measured interaction costs on large boards, with unchanged final coordinates, frame membership, snapping, search navigation, IME composition, nested scrolling, one-step gesture undo, and collaboration behavior. The current browser suite covers the simple-block path; mixed/stateful paths need further coverage in small changes.

### P2: Separate workspace persistence responsibilities

`features/projects/services/workspaceController.ts` is approximately 30 kB and owns loading/cache state, save scheduling, merges, recovery, and board operations. `BoardPage.tsx` still combines navigation, trash, sharing, and editor composition; metadata loading has been extracted. This concentration makes async ordering changes risky.

1. Document controller invariants: immutable snapshots, revision ownership, pending-save ordering, recovery draft retention, partial board protection, and remote rebase.
2. Extract request/loading coordination behind the current controller interface. Preserve bounded concurrency, retries, cache behavior, and deduplication.
3. Extract save queue and recovery coordination with explicit lifecycle cancellation/flush contracts.
4. Metadata loading is extracted and local-save refetches removed. Next extract trash state and review cross-tab membership/navigation invalidation using the existing remote revision contracts.

Acceptance: existing loading, HTTP, sharing, transfer, and collaboration tests pass; add cases for edits during an in-flight save, project changes during loads, logout/unmount, rate limits, and failed recovery. Do not migrate server state wholesale to a new library without proving these contracts can be preserved.

### P2: Isolate runtime adapters and feature boundaries

Mock authentication/workspace composition and import validation now load on demand. Feature modules still import the app-layer service module; blocks and canvas import other features directly. Existing TypeScript cycles and UI dependencies make opportunistic file moves unsafe.

Plan: separate runtime configuration/composition from feature contracts; inject service interfaces through narrow providers/hooks; expose explicit project/library contracts to blocks; preserve the asynchronous mock/HTTP bootstrap boundary. Keep the demo development mode working. Inspect the generated dependency graph before claiming bytes saved. Acceptance: HTTP startup excludes demo/mock implementation code, feature services do not import the app composition layer, and both adapters pass their contract tests. Add boundary enforcement only after agreeing on allowed dependencies; avoid blanket barrel files.

### P3: Defer inactive editors and review style/font cost

Document blocks initialize TipTap when mounted. Diagram/database blocks already use static SVG when inactive and initialize React Flow when editing. CSS includes many complete font faces and locales; the baseline entry CSS is about 201 kB (52.5 kB gzip). Emitted font files are not equivalent to fonts actually downloaded: unicode ranges and selected families determine requests.

Navigation/offscreen summaries now preserve mounted editor state. Next, measure editor mount cost and real font/network use, then consider an initial read-only document representation that delays TipTap creation until activation, preserving drafts, selection, search text, dimensions and custom typography. Split optional font families only with reliable saved-project font loading and Polish glyph coverage; preserve the existing font tests. Acceptance: improved cold startup/editor activation measurements with no layout jumps, missing glyphs, or content loss.

### P3: Profile history serialization

`ItemHistory.observe` canonicalizes current and incoming snapshots when array identity changes; remote rebasing also traverses history. Large document content can amplify this work.

Plan: profile typing, multi-item updates, and remote changes. If dominant, cache canonical keys at immutable snapshot boundaries or introduce per-item change tracking. Bound retained bytes as well as history entry count. Preserve normalization equivalence so server acknowledgements never create undo steps, and preserve collaborator edits through rebase. Avoid identity caches until immutability is an explicit contract.

## Validation and limitations

- Baseline: build passed, ESLint configuration was absent, and 19/20 test files passed with the demo portability failure.
- Current validation: production TypeScript/build, mock production bundle, ESLint (zero warnings), formatting, and all 26 frontend test files pass, including viewport/observer and camera presentation regressions. The browser suite adds seven frame profiles and twenty interaction cases; browser fixture/config types are checked separately. The historical demo failure is fixed. The earlier targeted backend security, board-validation, and presence run passed all 123 tests (no skipped tests); no backend source changed in these rendering follow-ups.
- New tests exercise lazy-import/render failures, local retry, sensitive error redaction, save failure/rejection/delay, queued edits/newly registered views during saves, unmount/unload protection, presence connection stability and stale board events, metadata request counts/cancellation, stale text-preview decoding, relation projection ownership/order, emitted HTTP loading boundaries, and mock bootstrap authorization.
- Existing HTTP, sharing, administrative security, schema validation, collaboration, transfer, and editor tests remain required. No backend endpoint contract or authorization rule was changed; the frontend participant wrapper now forwards an optional abort signal.
- The skill version detector reported installed React 19.3.0, TypeScript 6.0.3, and Tailwind 4.3.3. A TypeScript 7 migration is not required for this work.
- Unit DOM tests use Happy DOM; Playwright covers production-browser camera rendering, composition/portal retention, culling, scroll restoration and drag/undo. The projection/canvas-model scripts remain Node-only. Physical-device, broad accessibility, mixed-board, authenticated network and native unload-prompt studies remain outstanding.

Next delivery sequence: validate the mixed-board study on physical slower devices; profile remaining movement painting/layer costs; separate remaining canvas selection/navigation/dialog orchestration; measure deferred document initialization and retained memory before extending editor culling; continue workspace persistence boundaries according to measured impact. Keep each stage independently reviewable.
