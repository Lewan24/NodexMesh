# Canvas performance and interaction status

Reviewed against the frontend on 2026-09-24. The statements below describe code behavior; they are not browser benchmark claims.

## Implemented

- Mouse pan, wheel zoom, touch pan/pinch, and item/frame-group dragging publish visual changes on animation frames and flush final movement on release.
- Dragging uses transient geometry instead of writing persisted project state on every pointer event. Attached lines follow transient geometry and final positions commit as one board operation.
- Touch and mouse scheduled work is cancelled on blur/unmount. Coordinate refs remain current between React renders.
- Measurement publication is animation-frame batched. Canvas search results, nested matches, line geometry, frame locks, and unchanged block JSX are memoized where practical.
- Images use lazy loading/async decoding. YouTube embeds show a thumbnail and load the player/API only after activation.
- Editor canvas level-of-detail replaces eligible inactive blocks with lightweight skeletons at zoom `<= 0.20` on mobile and `<= 0.25` on desktop. Selected, focused, dragged, hovered, remotely attended, search-related, and geometry-sensitive items remain detailed.
- Save diffing begins after 250 ms but durable mutation requests are spaced to respect the server mutation limit.
- The backend uses board-scoped relation queries instead of transferring a large item-ID array to PostgreSQL.
- UUID creation falls back from `crypto.randomUUID()` to `crypto.getRandomValues()`, so the local HTTP demo works on devices where `randomUUID` requires a secure context.

## Current limits

- `Canvas` still mounts all frames/items. LOD reduces content complexity but does not provide viewport culling, so very large boards retain DOM, observers, state, paint, and memory costs offscreen.
- Camera state remains above the canvas and exact zoom still reaches wrappers that need scale-aware UI. A dedicated camera owner could further decouple pan/pinch cost from board size.
- Resizing and line endpoint manipulation still use direct update paths rather than the transient drag model.
- Inactive documents still initialize TipTap, and diagrams/database diagrams mount React Flow once detailed. Static inactive previews could defer those costs.
- Alignment, line lookup, and some frame/measurement paths scan arrays. Spatial or dependency indexes should be added only if profiling shows those scans dominate after culling.
- Public read-only boards render full block content rather than editor LOD.

## Recommended sequence

1. Record production-build baselines on representative 100/500/1,000+ item mixed boards.
2. Add viewport culling with overscan, conservative cached sizes, active-editor retention, crossing-line geometry, and search navigation coverage.
3. Profile camera ownership and wrapper rerenders; isolate transforms without competing React/imperative writes.
4. Add static inactive previews for documents and graph editors with detail hysteresis and focus/state preservation.
5. Convert resize/line interactions to scheduled transient geometry if traces justify it.
6. Add item/frame/connection/spatial indexes only for measured hot paths.

## Profiling checklist

Measure initial board entry, pan/zoom/pinch, single/multi/frame dragging, resize, line endpoints, detail-threshold transitions, search navigation, remote updates, and saves. Record frame-time distributions, dropped frames, long tasks, React commits, layout/paint, DOM/mounted-item counts, heap, save/diff frequency, requests, and bytes.

Test a production build on an actual weaker phone as well as a CPU-throttled desktop. Verify final coordinates, snapping, one undo step per gesture, columns, frames, locks, editor composition/focus, nested scrolling, line geometry, search, cancellation, board switching, and collaboration merges. A 16.7 ms frame budget at 60 Hz is a reference, not a guaranteed target.

## Undo/history boundary

Board history tracks item content/geometry, nested column items, tags, comments, appearance, and compound canvas operations. Pointer gestures and discrete keyboard actions form one step; continuous typing groups until a pause/field change. Native text undo and TipTap history remain active while their editors are focused. Pan, zoom, selection, dialogs, clipboard contents, theme, and diagram viewport are UI state and are not board history. History is in memory and resets on project switch/reload.
