# Camera rendering and the 60 FPS target

This follow-up separates live camera presentation from React content refreshes, moves camera state below the application shell, and uses readable fixed-note previews during navigation. It reduces main-thread work substantially. The current diagnostic browser still does not sustain 60 FPS on the fast 1,000-note path; painting/compositing and mixed-board work remain.

The subsequent [full-shell rendering study](WORKSPACE_RENDERING.md) adds alternating comparisons and traces, fixes grid texture invalidation and keeps offscreen overscan notes as previews at rest. The results below remain the earlier isolated Canvas study.

## Implemented boundaries

- `BoardCanvas` owns `useBoardCamera`. Camera changes no longer update `BoardPage` selection/tool state or rerender the whole board shell. User/project/board-scoped viewport persistence, page-hide/unmount flushing and the reset shortcut remain in the camera hook.
- `useCanvasCamera` presents the live scene transform independently of the memoized canvas content. Content refreshes when the viewport leaves a 160-screen-pixel safety margin inside the shared 320-pixel culling overscan, zoom changes by more than roughly 12%, or a detail/label threshold changes. After 120 ms without changes, the exact final camera and full content are rendered.
- React owns grid layout and content. The presentation hook owns scene/grid transforms; it reapplies the live camera after content commits. A bounded, composited grid is translated/scaled between content refreshes, avoiding a background repaint on every small movement. Dot radii can scale slightly between refreshes and return to their exact size at rest.
- Input conversion, search navigation, paste/menu positioning and zoom anchoring read live camera refs. Selected movement handles, title scales and remote cursor target positions are updated with the live camera. Zoom buttons read live zoom, so repeated actions do not use an older content snapshot.
- Only fixed-height notes without active selection, focus, drag/drop, search, remote attendance or custom CSS use navigation previews. They retain text, theme colors, typography, geometry and saved scroll offsets, with isolated layout/painting. Editor observers, hover controls and expensive shadows return at rest. Auto-sized notes and stateful editors keep their full content. Existing overview skeleton thresholds take precedence.

Camera changes continue to reach the controlled camera owner on every input frame. They are not delayed before viewport persistence. The board model, history and API authorization/validation contracts are unchanged. The diagnostic control API remains confined to the separate performance build.

## Browser comparison

The original [browser study](BROWSER_PERFORMANCE.md) measured culling against the original all-mounted implementation. This comparison instead uses the already-culled implementation at the start of this follow-up, with the same fixture, browser and camera path on both sides. Machine conditions differ from the earlier study, so its historical 26.3 FPS result must not be used as this run's baseline.

The protocol remains 90 animation-frame-driven synchronous camera updates, 89 frame intervals, 1,280 × 800 headless Chromium, no concurrent build/test workload. Scenarios now also include normal CPU speed and panning without zoom. The camera traverses 4,000 horizontal pixels and a 600-pixel vertical arc; this is a deliberately fast navigation workload.

| Workload                     | Effective FPS, before → after | p95 frame interval | Script time across path |
| ---------------------------- | ----------------------------- | ------------------ | ----------------------- |
| 100 notes, 4× CPU, pan/zoom  | 28.1 → 33.8                   | 66.6 → 50.1 ms     | 661.4 → 25.8 ms         |
| 500 notes, 4× CPU, pan/zoom  | 18.9 → 30.9                   | 100.0 → 66.7 ms    | 1217.1 → 37.6 ms        |
| 1000 notes, 4× CPU, pan/zoom | 19.0 → 30.3                   | 100.0 → 66.7 ms    | 1182.5 → 18.4 ms        |
| 1000 notes, 1× CPU, pan/zoom | 33.2 → 37.1                   | 50.0 → 50.0 ms     | 438.1 → 18.8 ms         |
| 1000 notes, 4× CPU, pan      | 24.8 → 32.8                   | 66.7 → 50.1 ms     | 821.9 → 27.1 ms         |

[Raw results](performance/camera-frame-results.json) retain complete metrics and protocol limitations. Counts at the end of the movement refer to navigation previews; full editors return afterward. The timing window covers movement, not the subsequent idle restoration. Full restoration and scroll/focus safety are verified by interaction tests, but restoration latency is not benchmarked here. No hardware-dependent FPS assertion is imposed.

The fixture mounts the controlled Canvas directly. The additional benefit of moving production camera ownership below `BoardPage` is therefore not represented by these FPS numbers. This study does not establish physical-phone, GPU memory, thermal or high-refresh-display performance. Lower script time is not by itself proof of 60 FPS.

## Validation and reproduction

From `Frontend`, install the test browser with `npx playwright install chromium`, then run:

```sh
npm run test:browser
npm run benchmark:browser
npm run typecheck:browser
npm test
npm run build
npm run lint
npm run format:check
```

Do not run other builds/tests alongside frame profiles. A custom browser install path requires the same `PLAYWRIGHT_BROWSERS_PATH` when running tests. `CANVAS_CPU_PROFILE=1` saves an inspectable CPU sample; sampling affects scores.

The suite has five frame profiles and eleven interaction regressions. The added cases exercise live collaboration/input coordinates between content refreshes, inverse scaling, exact settled zoom, preview/scroll restoration, retained focused/auto-sized/custom-styled content, wheel anchoring and final middle-drag coordinates. Existing cases cover culling/model retention, composition, portal drafts, remote height changes, connections, detail thresholds, native scrolling and drag/undo. Unit coverage verifies viewport safety across pan/zoom, threshold boundaries, preupdated input refs, idle synchronization, cleanup and board/account-specific camera persistence. Application build, browser types, lint and all 25 frontend test files pass. No backend source changed in this follow-up.

## Remaining plan toward consistent 60 FPS

1. **Measure physical devices and the production shell.** Record continuous pan, pinch/zoom, wheel, fast fling, settling and editing on at least one slower phone and an integrated-GPU laptop. Include mixed notes/documents/columns/frames/connections and collaboration. Use Chrome rendering traces to separate main-thread paint, raster, compositor/GPU and input delay. Record p50/p95/p99 frame intervals, missed refreshes, restoration latency and retained heap/texture memory. Compare repeated runs; do not infer the cause of all remaining time from aggregate CDP script/layout metrics.
2. **Optimize the measured paint/raster bottleneck.** Test bounded per-card layer promotion, paint isolation, connection layers and effects independently. Retain a change only if repeatable frame pacing improves without excessive GPU memory or reduced readability. Permanent scene promotion and disabling navigation blur were explored in this session without a clear benefit and were not retained. The grid is the only permanently promoted camera layer.
3. **Design a hybrid renderer if DOM painting remains limiting.** Prototype batched Canvas2D/WebGL previews for inactive blocks and connections, keeping semantic DOM/editor overlays for selected, focused and interactive items. Define hit testing, coordinate precision, text/font fidelity, themes, comments/presence, keyboard navigation, screen-reader semantics, exports and state retention before replacing the renderer. Compare against the current implementation with the same trace and memory protocol. This is a larger refactor and should remain opt-in until interaction parity is demonstrated.
4. **Extend state-preserving previews carefully.** Documents, code, diagrams, databases, task blocks and columns need editor-specific state retention before broader culling. Preserve undo/composition, unsaved content, caret/selection, native scrolling, nested ownership and collaborative updates. Public read-only boards need their own measured pass.

For a 60 Hz display, the working frame budget is 16.7 ms. A useful acceptance target is p95 near that budget during ordinary navigation, low input delay, no long idle-restoration stall and no editing or persistence regression. Sustained 60+ FPS has not been demonstrated by this headless run.
