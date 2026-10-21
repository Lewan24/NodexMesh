# Browser frame-rate work (2026-10-21)

The editable canvas now culls eligible offscreen blocks and avoids camera-only item rerenders. The browser benchmark uses the real Canvas and styles in a separate production build, with local fixture data. No authentication or backend contract was changed.

The subsequent [camera rendering follow-up](CAMERA_PERFORMANCE.md) separates live transforms/content refreshes and adds gesture previews. The numbers below remain the original culling study.

## Measured results

Headless Chromium, 1,280 × 800 viewport, CDP 4× CPU slowdown, fixed-height notes laid out in 30 columns. The camera follows the same pan/zoom path for 90 animation-frame-driven synchronous commits; 89 frame intervals are recorded after fonts and initial rendering settle. The theme provider sits above camera state, matching the application. The before/after runs used the same corrected fixture with no concurrent build/test workload. The baseline is an isolated copy of the pre-FPS canvas, retaining the earlier render-model/search refactors.

| Notes | Effective FPS, before → after | p95 frame interval | Observed long tasks | Mounted items at end |
| ----- | ----------------------------- | ------------------ | ------------------- | -------------------- |
| 100   | 18.9 → 37.1                   | 83.3 → 50.0 ms     | 32 → 2              | 100 → 21             |
| 500   | 6.5 → 27.0                    | 200.0 → 66.7 ms    | 89 → 3              | 500 → 35             |
| 1000  | 3.3 → 26.3                    | 416.7 → 66.7 ms    | 88 → 1              | 1000 → 35            |

These are browser rendering/frame-pacing measurements, replacing the previous Node-only evidence for this path. They are a single local diagnostic comparison, not a guaranteed device FPS or confidence interval. 4× CPU slowdown does not reproduce a physical phone's GPU, memory, thermals or display. Earlier exploratory runs whose fixture recreated theme context or used unstable default props were discarded. [Raw comparison data](performance/browser-frame-results.json) includes frame counts, DOM counts and CDP timing metrics.

## Implementation

- Memoize item/frame components using normal prop comparison. Hoist default arrays and stabilize resize callbacks. Only selected items and section titles receive exact zoom; other blocks receive an explicit detail-mode flag. The mobile media query is subscribed once at canvas level.
- Cull notes, text, icons, images, links and drawings outside a 320-screen-pixel overscan area. Keep selected/focused items, drag overrides, frame-capture previews, remote presence, search matches and dialog targets mounted. Frames, connection curves, section titles, stateful editors/columns and custom-CSS blocks remain mounted.
- Unknown or changed auto-sized content is rendered/measured before culling. Measurements carry the source item identity, including when dimensions stay unchanged, and removed-item caches are pruned. Fixed-height notes can use their known bounds immediately.
- Preserve nested scroll offsets across culling/detail transitions. Keep focused editors and portaled drafts alive through camera changes; clear retention when focus moves outside items/dialogs.
- Batch overflow observation across dirty items on an animation frame, read layout before writing attributes, ignore self-generated attribute notifications and cancel pending work after cleanup. CPU sampling identified overflow reads as a remaining source of synchronous layout work during mounting.

The persistence model still contains the complete board. Culling only changes mounted UI. Connection geometry still uses all items and cached sizes; curves stay rendered even when endpoints are culled. Backend authorization, schema checks and frame ownership validation remain unchanged.

## Reproduce

From `Frontend`:

```sh
npm ci
npx playwright install chromium
npm run test:browser
npm run benchmark:browser
```

Playwright builds `e2e/performance` into `dist-performance` and starts a separate loopback preview on port 4178. The performance entry/control API is excluded from application bundles, with an emitted-module regression assertion. The fixture never uses a live account or saved browser workspace. Browser binaries installed in a custom location require the same `PLAYWRIGHT_BROWSERS_PATH` when running tests (this session used `/tmp/nodexmesh-playwright`).

`npm run test:browser` includes the three CPU-throttled profiles and browser regressions for culling/model retention, focused composition, changed auto-height content, crossing connections, desktop/mobile detail thresholds, drag/undo, nested wheel scrolling, scroll restoration and a deselected portaled draft. The suite records FPS diagnostics without fragile hardware-dependent timing assertions. `test-results/browser-results.json` contains machine-readable output and attachments.

For an inspectable CPU sample:

```sh
CANVAS_CPU_PROFILE=1 npm run test:browser -- --grep '1000 notes'
```

This saves a `canvas.cpuprofile` under `test-results`, viewable in Chrome DevTools. Sampling itself affects timings; do not compare sampled scores to unprofiled scores. `npm run typecheck:browser` checks the fixture/config along with application types. Run the usual unit tests, build, lint and formatting checks separately from benchmark measurements.

## Remaining work

Dense retained selections or common search matches can still mount many blocks. Stateful document/graph/column/task editors and public read-only boards remain outside this first culling pass. A mixed-board/physical-device study and inactive previews with state retention are the next steps. Large selection overlays, background painting and transient resize/line paths should be profiled before changing their behavior. A 60 FPS target is not achieved or guaranteed by this CPU-throttled fixture.
