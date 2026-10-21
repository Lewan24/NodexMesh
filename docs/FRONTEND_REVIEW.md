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

| Items | Before | After |
| --- | --- | --- |
| 100 | 1.34 ms | 0.74 ms |
| 500 | 16.60 ms | 3.18 ms |
| 2,000 | 219.28 ms | 11.06 ms |

At 2,000 items, observed p95 changed from 222.89 ms to 16.92 ms. These are synthetic Node conversion measurements, not browser rendering or network timings; hardware, GC, and concurrent work affect them. The benchmark intentionally has no timing assertion in CI.

The shared ThemeProvider chunk changed from about 451.62 kB to 67 kB minified after deferring mock composition. Chunk boundaries also changed elsewhere; this is not a total startup-transfer or page-load timing claim.

## Larger refactors: stage and measure before implementation

### P2: Split canvas orchestration and add selective rendering

`features/canvas/components/Canvas.tsx` is approximately 56 kB of source and combines selection, search, drag/drop, geometry, frame handling, dialogs, and rendering. All item wrappers still mount; low-detail rendering reduces block complexity but does not cull offscreen DOM.

1. Establish production traces using 100, 500, and 1,000 mixed items, including many connections, nested columns, documents, frames, and remote presence. Record p95 frame time, long tasks, React commit counts, mounted nodes, and heap.
2. Extract pure selection/search and render-model calculations without changing state ownership. Keep immutable item identities and stable event contracts. Validate output against existing board fixtures.
3. Extract dialog/action composition and interaction coordination into focused hooks/components. Keep persistence and history boundaries explicit; avoid a single context carrying every camera update.
4. Introduce viewport culling with overscan and cached measurements. Retain focused editors, selected/dragged/remote-attended items, search destinations, and lines crossing the viewport even when endpoints are offscreen.
5. Profile again before introducing a spatial index or separate camera store.

Acceptance: fewer mounted nodes and lower measured interaction costs on large boards, with unchanged final coordinates, frame membership, snapping, search navigation, IME composition, nested scrolling, one-step gesture undo, and collaboration behavior. This needs browser interaction coverage and should be several small changes, not a canvas rewrite.

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

Document blocks initialize TipTap and graph blocks initialize React Flow when mounted in detail. CSS includes many complete font faces and locales; the baseline entry CSS is about 201 kB (52.5 kB gzip). Emitted font files are not equivalent to fonts actually downloaded: unicode ranges and selected families determine requests.

Plan: measure editor mount cost and real font/network use first. Add static inactive previews with activation on focus/edit, preserving selection, search text, dimensions, and custom typography. Split optional font families only with reliable saved-project font loading and Polish glyph coverage; preserve the existing font tests. Acceptance: improved cold startup/editor activation measurements with no layout jumps, missing glyphs, or content loss.

### P3: Profile history serialization

`ItemHistory.observe` canonicalizes current and incoming snapshots when array identity changes; remote rebasing also traverses history. Large document content can amplify this work.

Plan: profile typing, multi-item updates, and remote changes. If dominant, cache canonical keys at immutable snapshot boundaries or introduce per-item change tracking. Bound retained bytes as well as history entry count. Preserve normalization equivalence so server acknowledgements never create undo steps, and preserve collaborator edits through rebase. Avoid identity caches until immutability is an explicit contract.

## Validation and limitations

- Baseline: build passed, ESLint configuration was absent, and 19/20 test files passed with the demo portability failure.
- Current validation: production TypeScript/build, mock production bundle, ESLint (zero warnings), formatting, and all 22 frontend test files pass. The historical demo failure is fixed. The targeted backend security, board-validation, and presence suite also passes all 123 tests (no skipped tests).
- New tests exercise lazy-import/render failures, local retry, sensitive error redaction, save failure/rejection/delay, queued edits/newly registered views during saves, unmount/unload protection, presence connection stability and stale board events, metadata request counts/cancellation, stale text-preview decoding, relation projection ownership/order, emitted HTTP loading boundaries, and mock bootstrap authorization.
- Existing HTTP, sharing, administrative security, schema validation, collaboration, transfer, and editor tests remain required. No backend endpoint contract or authorization rule was changed; the frontend participant wrapper now forwards an optional abort signal.
- The skill version detector reported installed React 19.3.0, TypeScript 6.0.3, and Tailwind 4.3.3. A TypeScript 7 migration is not required for this work.
- DOM interaction tests use Happy DOM. No real-browser latency, keyboard/touch, accessibility, or authenticated backend timing measurements were taken. Before release, smoke-test these changes in real browsers, particularly a rejected deployment chunk, native unload prompts, board switching, IME drafts, and remote presence.

Next delivery sequence: record browser baselines; separate canvas render/search orchestration; introduce viewport culling with active-editor retention and crossing-line geometry; then continue workspace persistence boundaries and inactive editor previews according to measured impact. Keep each stage independently reviewable.
