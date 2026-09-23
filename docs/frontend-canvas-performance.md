# Frontend canvas performance review

Reviewed: 2026-09-23.

## Purpose and scope

Preserve the findings from a source-code review of board rendering, mouse and touch navigation, dragging, resizing, geometry, and persistence. The goal is smoother interaction and faster rendering, particularly on older or weaker devices and large boards.

These are code-based findings and proposed improvements, not measured browser bottlenecks. No application changes or performance benchmarks were performed as part of this review. Recheck the referenced code before implementing because it may have changed since the review.

## Current architecture and existing optimizations

- The board canvas uses positioned DOM components inside a translated and scaled container. It is not a single bitmap canvas.
- `useBoardView` owns React state for pan, zoom, selection, and the active tool. Camera updates therefore reach `BoardPage` and `Canvas`.
- `Canvas` renders every frame and regular item; viewport clipping does not unmount offscreen content.
- `CanvasItem` memoizes its expensive block subtree. Most block content receives a constant zoom of 1; section titles receive the actual zoom. This already avoids some expensive subtree work during camera movement.
- Touch camera updates are coalesced with `requestAnimationFrame`, with final updates flushed at gesture boundaries.
- Low-detail placeholders replace eligible items at zoom <= 0.2 on mobile and <= 0.25 on desktop. Selected, focused, dragged, hovered, remotely attended, and certain item types are exempt. Active search disables this simplification.
- Several expensive block types use lazy imports. Images already use lazy loading in `ImageBlock`.
- Item measurements are published to React at most once per animation frame. Number normalization uses a WeakMap cache and preserves unchanged object identities.
- Persistence starts a batch after 250 ms from the first edit. It is not a network request for every mouse event, but saving can run during continuous dragging.

## Prioritized improvements

### 1. Separate temporary dragging from persisted board data

**Finding:** `useItemDrag` calls `onUpdateItem` once per captured item on every mouse move. Moving a frame also captures its contents. Each update passes through whole-board mapping, number normalization, frame-membership normalization, and workspace publication. React batching does not eliminate the synchronous work inside each update.

**Proposal:**

- Keep a temporary interaction state containing captured starting geometry and the latest drag delta.
- Update visual positions once per animation frame.
- Commit all final positions in a single board operation on release, including final snapping.
- Apply the same principle to resize and line-endpoint manipulation where appropriate.
- Make attached lines, alignment previews, and drop targets read effective geometry: persisted geometry plus any active interaction override.
- If live collaboration needs intermediate movement, send throttled ephemeral previews separately from durable edits.

**Expected benefit:** Less repeated board traversal, allocation, normalization, subscriber notification, and persistence work, especially for frame and multi-item dragging.

**Correctness requirements:** Preserve one undo entry per interaction, frame membership, column drops, snapping, movement locks, collaboration conflict handling, and final pointer position. Define cancellation behavior for blur, gesture interruption, unmount, and board switching. Apply patches against current state rather than replacing newer remote data with a captured board snapshot.

### 2. Cull content outside the viewport

**Finding:** `Canvas` maps all frames and regular items into mounted components. Offscreen editors, diagrams, observers, and component state remain present.

**Proposal:**

- Calculate the viewport in board coordinates and render items intersecting it plus an overscan margin.
- Keep actively edited, focused, or dragged items mounted even when outside that region.
- Preserve cached dimensions when content is unmounted. Use conservative size estimates before an item has been measured.
- Handle lines by their resolved geometry and viewport intersection, not only by endpoint visibility.
- Keep complete board data available for search, selection, geometry, and collaboration independently of mounted DOM.
- Use buffered visibility regions or similar hysteresis to avoid excessive mounting at viewport boundaries.
- Start with a simple bounds filter; add a spatial index if profiling shows filtering itself is expensive.

**Expected benefit:** Lower DOM count, memory usage, observer activity, and expensive block initialization. Zooming into one part of a large board should not initialize full content everywhere else.

**Correctness requirements:** Avoid losing editor state or focus, measurement-driven layout jumps, broken crossing connections, and search navigation failures. Account for frame labels, handles, shadows, and custom CSS extending beyond nominal bounds.

### 3. Isolate camera updates from the board component tree

**Finding:** Camera state lives above `Canvas`. Item wrappers are not memoized, and exact zoom is passed to every item. Memoized block content helps, but does not prevent wrapper rendering or parent calculations.

**Proposal:**

- Give the camera a small, dedicated owner with a single authoritative current transform.
- Update the camera transform once per animation frame without requiring the entire board page to rerender.
- Let controls, overlays, and visibility calculations subscribe only to the camera information they need.
- Memoize item and frame wrappers after stabilizing their props and callbacks.
- Pass a discrete detail level to ordinary content instead of exact zoom. Keep precise scale subscriptions where needed, such as inverse-scaled handles and section titles.
- Avoid competing imperative and React writes to the same transform. Keep coordinate conversion synchronized with the displayed camera.

**Expected benefit:** Pan and pinch costs become less dependent on total board size.

### 4. Schedule mouse and touch work consistently

**Finding:** Touch pan and pinch already use animation-frame scheduling. Mouse panning, wheel zoom, item dragging, resizing, and line manipulation generally process events directly. Touch item movement dispatches synthetic mouse events into the existing mouse pipeline.

**Proposal:**

- Share a scheduler that processes the latest absolute movement once per animation frame.
- Accumulate wheel deltas, preserving zoom anchoring, rather than dropping intermediate wheel input.
- Flush final pending movement on release and cancel scheduled callbacks on unmount or board switch.
- Keep input coordinate refs current even before React publishes a render.
- Consider Pointer Events and pointer capture later to unify mouse, touch, and pen lifecycles. Preserve native controls, nested scrolling, long-press movement, and two-finger gestures.

**Priority note:** Scheduling and reducing work behind the handlers should precede a broad input API migration. Replacing synthetic events alone is not an established performance fix.

### 5. Reduce layout and paint during movement

**Finding:** Item positioning changes `left` and `top`. Dragging adds perspective rotation, scaling, and drop shadows. The canvas changes the position and size of two gradient backgrounds during navigation. Settling CSS also targets positional properties.

**Proposal:**

- Use translation transforms for temporary movement, with drag decoration on a separate inner wrapper.
- Keep committed coordinates separate from temporary visual offsets.
- Profile grid repainting; evaluate an independently transformed grid layer or simpler grid if traces justify it.
- Provide reduced drag shadows, tilt, and other effects through a performance preference or measured adaptation.
- Apply `will-change` selectively during interactions rather than permanently to all items; excessive compositing layers can increase memory use.

**Validation:** Use paint flashing and rendering traces. Transforms are generally preferable to layout-triggering positional changes, but GPU promotion and smoothness are not guaranteed.

### 6. Use lightweight previews for expensive blocks

**Finding:** `DocumentBlock` creates a TipTap editor even when not editing. Diagram and database blocks mount React Flow. Lazy module loading does not remove the ongoing cost of mounted instances.

**Proposal:**

- Render a safe lightweight document preview while inactive, and initialize the editor on edit.
- Evaluate static previews for inactive diagrams while retaining full interaction when needed.
- Preserve selection, content, scroll position, and focus through preview/editor transitions.
- Add hysteresis to detail-level changes so pinch movement near a threshold does not repeatedly mount and unmount heavy content.
- Review the mobile threshold: mobile currently retains full content down to 20% zoom, compared with 25% on desktop.
- Keep search highlights and navigation available without forcing full content for every item when search is active.
- Base adaptive detail on observed performance or a user preference; screen width alone does not identify weak hardware.

**Expected benefit:** Faster board entry and lower memory/CPU costs on document-heavy and diagram-heavy boards.

### 7. Index geometry and invalidate only affected calculations

**Finding:** Alignment scans items during movement. Line resolution performs array searches for attached endpoints. Frame lock derivation scans board contents for each frame. Sorting and resolved-item calculations rerun when the item array changes.

**Proposal:**

- Maintain item-by-ID, frame-membership, and item-to-connected-lines indexes.
- Recompute connected geometry only for changed items and their dependent lines.
- Cache alignment anchors and avoid rebuilding them for every pointer event.
- Consider axis-based anchor indexes for snapping. Restricting snapping to nearby rectangles could change current behavior, which allows alignment along an axis across longer distances.
- Keep z-order derivation independent from position-only changes where practical.
- Use sets for repeated membership checks when selection or drag groups are large.
- Reuse indexed geometry for culling, drop targets, and lost-board detection where appropriate.

**Priority note:** Measure before adding complex indexing. Transient drag state and culling may remove enough work to make simpler structures sufficient.

### 8. Keep durable diffing out of high-frequency interactions

**Finding:** Workspace updates publish synchronously and schedule saving after 250 ms. `diffBoard` rebuilds flattened representations and compares canonical item data. Continuous dragging can therefore overlap with full-board diff work.

**Proposal:**

- First remove temporary drag updates from the durable state pipeline.
- Batch multi-item changes into one update and avoid publishing effective no-ops.
- Track dirty items or cache unchanged flattened representations if board diffing remains a measured bottleneck.
- Preserve bounded save latency for typing and other durable edits; do not replace the current batching with an indefinitely postponed debounce.
- Maintain existing revisions, conflict recovery, retry behavior, and board-switch flush guarantees.

### 9. Reduce measurement and subscription overhead after the main changes

**Finding:** Each mounted `ItemWatcher` creates a ResizeObserver. Measurement handling performs item searches and frame scans, although React measurement publication is already batched. Each `CanvasItem` also subscribes to mobile layout through `useMobileLayout`.

**Proposal:**

- Evaluate a shared ResizeObserver and indexed item/frame lookups if measurement overhead is significant.
- Share media-query state rather than creating per-item subscriptions where practical.
- Prune stale measurement and geometry entries when items disappear or boards change.
- Preserve loading guards and auto-growth behavior when restructuring measurements.

**Priority note:** These are secondary candidates. A per-item observer or subscription is not by itself proof of a bottleneck; culling may already reduce their counts substantially.

## Suggested implementation sequence

1. Record a reproducible production-build baseline.
2. Isolate camera updates and apply consistent animation-frame scheduling.
3. Introduce transient drag geometry and one batched final commit, including connected lines and group movement.
4. Add viewport culling with overscan, cached dimensions, and active-item retention.
5. Introduce lightweight expensive-block previews and detail-level hysteresis.
6. Optimize geometry indexes, diffing, paint effects, and measurement overhead according to remaining traces.

Keep each step independently reviewable. Avoid mixing a broad gesture rewrite, renderer rewrite, persistence rewrite, and culling into one change.

## Profiling and validation plan

Use production builds with representative mixed boards around 100, 500, and 1,000 items. Include text, images, long documents, diagrams, lines, frames with many children, and dense clusters. Include both mostly offscreen boards and boards where many items are visible at once.

Measure these interactions separately:

- Initial board entry and return to a previously viewed board.
- Mouse pan and wheel zoom.
- One-finger pan and two-finger pinch.
- Single-item, multi-item, and frame-with-contents dragging.
- Resizing and moving attached line endpoints.
- Zooming across detail thresholds.
- Searching a large board and navigating to offscreen matches.
- The same interactions while saves and remote updates occur.

Record frame-time distributions and dropped frames, main-thread long tasks, React render/commit work, style/layout/paint time, DOM and mounted-item counts, memory, and save/diff frequency. A 60 Hz display has roughly 16.7 ms per frame for all work; this is a budget reference, not an achieved result or a guarantee for every device.

Test an actual weaker mobile device as well as a CPU-throttled desktop. Desktop throttling does not reproduce mobile GPU, memory, or touch behavior completely.

Verify undo, snapping, final coordinates, column drops, frame ownership, locks, editor focus and composition, nested scrolling, crossing lines, gesture cancellation, board switching, search navigation, and collaboration consistency. Existing touch tests are useful behavior coverage, but are not browser performance measurements.

## Source map

Paths are relative to this document.

| Area | Source |
| --- | --- |
| Camera state | [useBoardView.ts](../Frontend/src/features/board/hooks/useBoardView.ts) |
| Page integration | [BoardPage.tsx](../Frontend/src/features/board/pages/BoardPage.tsx) |
| Canvas rendering and grid | [Canvas.tsx](../Frontend/src/features/canvas/components/Canvas.tsx) |
| Item content memoization and detail levels | [CanvasItem.tsx](../Frontend/src/features/canvas/components/CanvasItem.tsx) |
| Frame rendering | [CanvasFrame.tsx](../Frontend/src/features/canvas/components/CanvasFrame.tsx) |
| Mouse navigation | [useCanvasMouse.ts](../Frontend/src/features/canvas/hooks/useCanvasMouse.ts) |
| Wheel zoom | [useCanvasZoom.ts](../Frontend/src/features/canvas/hooks/useCanvasZoom.ts) |
| Touch gestures | [useCanvasTouch.ts](../Frontend/src/features/canvas/hooks/useCanvasTouch.ts) |
| Item dragging | [useItemDrag.ts](../Frontend/src/features/canvas/hooks/useItemDrag.ts) |
| Resize and line interaction | [useItemResize.ts](../Frontend/src/features/canvas/hooks/useItemResize.ts), [useLineDrag.ts](../Frontend/src/features/canvas/hooks/useLineDrag.ts) |
| Board mutations | [useProjectItems.ts](../Frontend/src/features/projects/hooks/useProjectItems.ts) |
| Number normalization | [normalizeNumbers.ts](../Frontend/src/entities/board/normalizeNumbers.ts) |
| Geometry and snapping | [lineGeometry.ts](../Frontend/src/features/canvas/utils/lineGeometry.ts), [frameGeometry.ts](../Frontend/src/features/canvas/utils/frameGeometry.ts), [alignmentGuides.ts](../Frontend/src/features/canvas/utils/alignmentGuides.ts) |
| Visibility detection | [useCanvasLostState.ts](../Frontend/src/features/canvas/hooks/useCanvasLostState.ts) |
| Measurements | [ItemWatcher.tsx](../Frontend/src/features/canvas/components/ItemWatcher.tsx), [useCanvasMeasurements.ts](../Frontend/src/features/canvas/hooks/useCanvasMeasurements.ts) |
| Block dispatch and lazy imports | [BlockRenderer.tsx](../Frontend/src/features/blocks/BlockRenderer.tsx) |
| Document editor | [DocumentBlock.tsx](../Frontend/src/features/blocks/document/DocumentBlock.tsx) |
| Persistence and diffing | [workspaceController.ts](../Frontend/src/features/projects/services/workspaceController.ts), [boardAdapter.ts](../Frontend/src/features/projects/services/boardAdapter.ts) |
| Drag styling | [index.css](../Frontend/src/app/styles/index.css) |
| Mobile layout subscriptions | [MobilePanel.tsx](../Frontend/src/shared/components/dialogs/MobilePanel.tsx) |
| Existing touch coverage | [canvas-touch.test.mjs](../Frontend/tests/canvas-touch.test.mjs) |

## External references

- [React memo](https://react.dev/reference/react/memo): memoization depends on stable props and should be validated with profiling.
- [React useMemo](https://react.dev/reference/react/useMemo): cached computation and JSX reuse are performance optimizations, not semantic guarantees.
- [High-performance CSS animations](https://web.dev/articles/animations-guide): prefer transform/opacity where appropriate and inspect layout and paint costs.

## Context for future work

The requested outcome is smoother rendering and mouse/touch movement on weaker devices. The strongest candidates identified by this review are camera isolation, transient batched dragging, and viewport culling. Preserve the existing useful optimizations and measure each change. No decision to replace the DOM renderer with Canvas/WebGL was made, and no specific speedup has been established.
