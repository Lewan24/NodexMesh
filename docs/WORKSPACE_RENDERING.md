# Full-shell rendering study

This follow-up measures the production-built application shell, persisted camera owner and editor restoration. It fixes repeated grid rasterization during pan and avoids restoring offscreen note editors. It brings the tested panning workload closer to 60 FPS, but does not establish sustained 60 FPS across devices or mixed-board interactions.

## What is measured

The separate diagnostic build boots the actual `main.tsx`, App, AuthProvider, BoardPage, sidebar, task/library/theme providers and BoardCanvas. Only authentication and persistence transport use the existing isolated demo services. This is not an authenticated HTTP/backend, live collaboration, network or physical-device benchmark. The fixture refuses to overwrite an existing, unmarked demo database; browser tests verify this guard. The normal application build retains its configured transport and excludes all diagnostic entry points.

Two validated synthetic workspaces are loaded into fresh browser contexts:

- **Notes:** 1,000 fixed-size notes in 30 columns.
- **Mixed:** 240 fixed-size notes, four documents, four columns containing 16 nested notes, four frames, 80 connections, a diagram and a mindmap.

The profile drives the real middle-drag handlers through 90 frame-paced DOM mouse events over 4,000 horizontal pixels and a 600-pixel vertical arc. It flushes the release position, waits for full visible editors to return and samples another 20 animation frames. These are synthetic events, not hardware input-latency measurements. Coordinates, editor readiness and unexpected external/API requests are checked. The update-version response is stubbed; all unexpected API or external requests are blocked.

The comparison uses two separate production previews. The baseline is an isolated copy retaining the earlier camera refactor, with only grid wrapping and offscreen editor selection reversed. Before/after order alternates across four repeats per board/variant in one serial browser run. No builds or other checks run concurrently. Both use Chromium 156.0.8078.4, 1,280 × 800 and CDP 4× CPU slowdown. The reported renderer is **SwiftShader software rendering**, not a hardware phone/laptop GPU.

## Untraced results

| Board | Median FPS, before → after | Observed FPS range, before → after | Visible-editor restoration | Restoration long tasks (4 runs) | DOM nodes   |
| ----- | -------------------------- | ---------------------------------- | -------------------------- | ------------------------------- | ----------- |
| Notes | 53.4 → 55.2                | 44.9–55.1 → 51.8–58.0              | 170.7 → 145.1 ms           | 1 → 0                           | 841 → 657   |
| Mixed | 46.2 → 50.4                | 39.6–47.7 → 49.0–52.4              | 205.5 → 164.4 ms           | 4 → 0                           | 2328 → 2144 |

Values are medians of four runs per variant; FPS ranges and individual runs are preserved in [raw results](performance/workspace-rendering-results.json). Run p95/p99 frame intervals are recorded individually, rather than claiming a pooled percentile from four small samples. Restoration includes the deliberate 120 ms camera-idle delay and ends at the first animation frame after visible editors return. Offscreen overscan previews are intentionally retained; visible previews must be zero.

At this stage, the mixed board produced four observed long tasks in the post-restoration window across four runs, both before and after. The change reduces restoration-phase stalls; it does not eliminate subsequent editor/measurement work. These numbers do not supersede the earlier [isolated Canvas pan/zoom comparison](CAMERA_PERFORMANCE.md): the shell, event driver, viewport area and pan-only path differ. A 16.7 ms p95 budget has not been consistently met.

## Trace findings and retained fixes

| Board | Aggregate raster worker time, before → after |
| ----- | -------------------------------------------- |
| Notes | 1044.6 → 324.9 ms                            |
| Mixed | 1180.5 → 607.6 ms                            |

Tracing is a separate diagnostic pass because it changes timings. Raster totals sum events across worker threads and are not elapsed wall time. Paint/layer durations can include nested events; categories must not be added together as an exclusive CPU breakdown. Full compressed traces and summaries are retained locally under `Frontend/playwright-report/workspace-rendering-study`, ignored by Git, and can be regenerated with the commands below.

**Grid wrapping.** The previous grid background position changed on every coarse content refresh, invalidating its large dot texture even during pure pan. The grid now uses fixed background positions and wraps translation within one major tile. Scaling is centered on the viewport to maintain overscan coverage and world-coordinate alignment. Panning no longer changes the texture's background size/position; zoom still updates texture size when necessary. Unit checks cover phase alignment and coverage across zoom and large viewport sizes; a browser pixel comparison checks positive/negative tile crossings.

**Offscreen editor restoration.** Known-width/height notes inside overscan retain readable previews while outside the viewport. Full editors return for visible or active/selected/focused/remote-attended items. Unknown-width, auto-sized, custom-CSS and stateful blocks retain their conservative rendering policy. The model and history are unchanged. This reduces mounted editor controls/observers and DOM nodes without delaying visible interaction. Real mouse, edit, save and reload regressions exercise the production camera and persistence path.

Whole-scene and per-preview layer promotion were tested but not retained: reduced paint/raster costs came with increased layer-building cost and no convincing frame-pacing benefit. Frame-by-frame editor restoration was also rejected: mixed-board restoration grew to roughly 0.75 seconds with repeated long tasks. The shipped implementation uses neither extra promotion nor progressive restoration scheduling. The grid remains the existing permanently promoted camera layer.

## Reproduce

From `Frontend`, with Chromium installed (`npx playwright install chromium`):

```sh
npm run benchmark:workspace -- --repeat-each 4
CANVAS_CPU_SLOWDOWN=1 npm run benchmark:workspace -- --repeat-each 4
CANVAS_RENDER_TRACE=1 npm run benchmark:workspace
npm run test:browser
```

The test server builds the diagnostic entries into `dist-performance` and serves loopback port 4178. Supply `PLAYWRIGHT_BROWSERS_PATH` if Chromium was installed into a custom directory. Run benchmarks separately from builds/tests. Traces are gzip-compressed Chrome trace JSON with movement/restoration/post-restoration marks; decompress if required by the trace viewer. The summary parser validates markers and phase order and preserves worker-thread identities.

For an alternating comparison, first build and serve a compatible baseline diagnostic entry on loopback port 4179, then run:

```sh
CANVAS_BASELINE_URL=http://127.0.0.1:4179 npm run benchmark:workspace -- --repeat-each 4
```

The baseline must use the same fixture/protocol and transport isolation. This optional URL accepts only an explicit IPv4 loopback origin. Performance artifacts under `test-results` are replaced by later runs; save them separately before running the complete suite. The committed raw report contains all comparison samples and selected trace summaries. JS heap usage is an observed snapshot, not retained-heap or GPU-memory evidence.

## Follow-up: recovery callbacks and retained heavy previews

The subsequent pass addresses the post-restoration task and adds state-preserving previews for documents, columns, diagrams and database blocks. Its baseline is the production build **after** the grid/offscreen-note changes above. The same two seeded workspaces, input protocol, software renderer and 4× CPU slowdown are used, with four alternating repeats per variant. These runs are a separate comparison; do not compare their absolute scores across sessions with the first table.

| Board | Median movement FPS, before → after | Median recovery FPS | Visible-editor restoration | Post-restoration long tasks (4 runs) |
| ----- | ----------------------------------- | ------------------- | -------------------------- | ------------------------------------ |
| Notes | 50.4 → 52.1                         | 60.0 → 60.0         | 145.8 → 157.1 ms           | 0 → 0                                |
| Mixed | 45.3 → 44.7                         | 52.2 → 58.6         | 167.9 → 175.8 ms           | 4 → 0                                |

The movement ranges overlap (mixed: 42.1–49.0 before, 41.4–46.4 after). This comparison demonstrates fewer recovery hitches, **not improved movement FPS or sustained 60 FPS**. First visible restoration is slightly slower; the subsequent expensive render is removed. All samples, including unchanged/worse values, are in [heavy-block raw results](performance/heavy-block-rendering-results.json). The final full-suite frame profiles are functional checks and are excluded from this comparison.

**Measured cause.** Source-mapped CPU samples identify a React scheduled render after measurement publication. Measurement-dependent drag/resize/connection callbacks changed identity, invalidating memoized item/block content. Stable event props now forward to the latest **committed** handlers, so gestures still read current geometry and collaboration permissions without forcing every editor to render again. A memoized-child test verifies both skipped renders and fresh event results/permissions. In a separate matched trace, the post-restoration task was 74.4 ms before and absent after; sampled React root work in that window fell from about 72.4 to 11.4 ms. Sampling and nested trace totals are diagnostic, not exclusive wall-clock costs. A callback-only diagnostic also removed the recovery long task before heavy previews were added; the combined result must not be attributed solely to previews.

**Retained editors.** Inactive, measured heavy blocks show bounded text summaries during navigation, at low zoom and while outside the viewport. Summaries preserve card color and typography but intentionally simplify rich formatting, nested controls and graph edges during movement. At normal zoom, full visible content returns when the camera settles. The editor DOM and React component stay mounted behind `content-visibility: hidden`, with inert/hidden accessibility state and frozen measured bounds; selection, focus, nested selection, remote attendance, search matches and capture targets retain full content. Custom CSS, including styles inside nested columns, disables heavy previews. Preview summaries use escaped React text, bounded input/output and no HTML insertion or resource loading. Custom-style detection terminates on cyclic/deep column references.

Item measurement and overflow observation stop while a heavy preview is displayed and resume on reveal. A lazy block replacing a same-sized loading placeholder now explicitly requests a fresh observation; otherwise it could remain unmeasured indefinitely. Unknown or changed auto-sized content is measured before hiding again. Browser checks cover same-node retention, document edit mode/content, scroll positions, model updates while hidden, auto-height geometry, low zoom, selection/search/remote activity, nested custom CSS and graph editor portals.

This is a painting optimization and a foundation for further work. It does **not** defer initial TipTap construction, stop all child effects, remove retained DOM or establish memory savings. Mixed-board DOM nodes increased from 2144 to 2209 because summaries coexist with retained editors. Graph editors already use SVG when inactive; React Flow mounts when editing. Deferring initial document editor creation remains separate work requiring draft/selection and activation measurements.

Reproduce CPU attribution with `CANVAS_RENDER_TRACE=1 CANVAS_CPU_PROFILE=1 npm run benchmark:workspace -- --grep mixed`; both diagnostics affect timing and should be excluded from FPS comparisons. Full matched traces/CPU profiles and logs are retained locally in the ignored `Frontend/playwright-report/heavy-block-rendering-study` directory. Use the earlier alternating-comparison instructions with a saved pre-change diagnostic build to reproduce the comparison.

## Document layout correction

Documents now keep their normal rich-text renderer throughout panning, offscreen movement and low zoom. The plain-text navigation summary changed document formatting and controls during movement and caused visible layout jumps, so document preview eligibility and its summary implementation were removed. Auto-height and fixed-height documents preserve their DOM, formatting, geometry and scroll positions; regressions sample these properties during camera commits and verify editing afterward. Columns retain their existing preview behavior. Diagrams and database schemas also keep their normal SVG previews throughout camera movement and low zoom; they never switch to text summaries or skeletons. Stable interaction callbacks and the lazy-placeholder measurement fix remain in place.

The comparison above records the earlier implementation that included document summaries. It is historical evidence, not a benchmark of this layout correction; no new FPS improvement is claimed.

## Next work

1. Repeat on an actual slower phone and an integrated-GPU laptop. Include physical input delay, pinch/wheel/zoom, fast fling, high-refresh displays, texture memory and sustained thermal conditions. The current controlled study measures panning on a software renderer.
2. Profile the remaining movement cost on physical hardware. Recovery callback churn is fixed in the controlled comparison; mixed-board panning still misses a consistent 16.7 ms frame budget. Paint, layer-building, connections and offscreen editor effects remain candidates, requiring attribution before further changes.
3. Prototype a hybrid inactive-block/connection renderer only if hardware traces still show DOM painting as the limiting factor. Preserve semantic DOM editing, accessibility, font/theme fidelity, history, selection, exports and collaborative updates. The larger acceptance plan remains in [CAMERA_PERFORMANCE.md](CAMERA_PERFORMANCE.md).

The browser suite contains seven default frame profiles and twenty interaction regressions. The document layout correction reruns the six affected browser cases, all 26 frontend test files, the production build, browser types and lint/formatting checks. Backend source and API authorization contracts were not changed.
