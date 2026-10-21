# Canvas performance and interaction status

Updated against the frontend on 2026-10-21. Code behavior and Node benchmarks are described below; [BROWSER_PERFORMANCE.md](BROWSER_PERFORMANCE.md) records the production-browser frame-pacing measurements and their limits.

The [2026-10-21 frontend review](FRONTEND_REVIEW.md) records screen-level and mock-runtime lazy loading, indexed connection endpoint and board-relation lookups, metadata request isolation, collaboration dependency fixes, error recovery, and a staged refactor plan with validation results and a reproducible projection benchmark.

## Implemented

- Authenticated startup downloads project summaries and item counts. Main-board content loads on opening a project, with a centered “Project is loading, please wait.” status while item content downloads in bounded asynchronous pages (50 items per page, at most three concurrent downloads). Loaded projects are cached for the session; full board editing starts after snapshot validation.

- Mouse pan, wheel zoom, touch pan/pinch, and item/frame-group dragging publish visual changes on animation frames and flush final movement on release.
- Dragging uses transient geometry instead of writing persisted project state on every pointer event. Attached lines follow transient geometry and final positions commit as one board operation.
- Touch and mouse scheduled work is cancelled on blur/unmount. Coordinate refs remain current between React renders.
- Measurement publication is animation-frame batched. `useCanvasRenderModel` separates layer/geometry calculations from canvas orchestration. Frame locks propagate once through ownership and remain memoized during camera, drag-preview and measurement-only updates. Search navigation/highlights share content matching and indexed frame context. Unchanged block JSX remains memoized.
- Images use lazy loading/async decoding. YouTube embeds show a thumbnail and load the player/API only after activation.
- Editor canvas level-of-detail replaces eligible inactive blocks with lightweight skeletons at zoom `<= 0.20` on mobile and `<= 0.25` on desktop. Selected, focused, dragged, hovered, remotely attended, search-related, and geometry-sensitive items remain detailed.
- Save diffing begins after 250 ms but durable mutation requests are spaced to respect the server mutation limit.
- The backend uses board-scoped relation queries instead of transferring a large item-ID array to PostgreSQL.
- UUID creation falls back from `crypto.randomUUID()` to `crypto.getRandomValues()`, so the local HTTP demo works on devices where `randomUUID` requires a secure context.

## Current limits

- The editable canvas culls eligible simple blocks with overscan. Stateful editors, columns, task blocks, frames, connection curves, custom-CSS blocks and retained activity still mount offscreen; these can dominate mixed-board costs.
- Camera state remains above the canvas and exact zoom still reaches wrappers that need scale-aware UI. A dedicated camera owner could further decouple pan/pinch cost from board size.
- Resizing and line endpoint manipulation still use direct update paths rather than the transient drag model.
- Inactive documents still initialize TipTap, and diagrams/database diagrams mount React Flow once detailed. Static inactive previews could defer those costs.
- Alignment, some interaction-specific line lookups, and frame normalization/measurement paths still scan arrays. Frame lock derivation and descendant drag capture now use ownership indexes. Full-board connection rendering and comment/tag projection now use indexes. Spatial or dependency indexes should be added only if profiling shows those scans dominate after culling.
- Public read-only boards render full block content rather than editor LOD.

## Recommended sequence

1. Record production-build baselines on representative 100/500/1,000+ item mixed boards.
2. Extend the measured simple-block culling to stateful editors only after preview/state retention is designed and verified. Keep curve geometry and search navigation intact.
3. Profile camera ownership and wrapper rerenders; isolate transforms without competing React/imperative writes.
4. Add static inactive previews for documents and graph editors with detail hysteresis and focus/state preservation.
5. Convert resize/line interactions to scheduled transient geometry if traces justify it.
6. Add item/frame/connection/spatial indexes only for measured hot paths.

## Profiling checklist

Measure initial board entry, pan/zoom/pinch, single/multi/frame dragging, resize, line endpoints, detail-threshold transitions, search navigation, remote updates, and saves. Record frame-time distributions, dropped frames, long tasks, React commits, layout/paint, DOM/mounted-item counts, heap, save/diff frequency, requests, and bytes.

Test a production build on an actual weaker phone as well as a CPU-throttled desktop. Verify final coordinates, snapping, one undo step per gesture, columns, frames, locks, editor composition/focus, nested scrolling, line geometry, search, cancellation, board switching, and collaboration merges. A 16.7 ms frame budget at 60 Hz is a reference, not a guaranteed target.

## Undo/history boundary

Board history tracks item content/geometry, nested column items, tags, comments, appearance, and compound canvas operations. Pointer gestures and discrete keyboard actions form one step; continuous typing groups until a pause/field change. Native text undo and TipTap history remain active while their editors are focused. Pan, zoom, selection, dialogs, clipboard contents, theme, and diagram viewport are UI state and are not board history. History is in memory and resets on project switch/reload.

## Completed checklist and kanban tasks

Checklist and kanban blocks show all tasks by default. The “Only unfinished tasks” toggle saves `hideCompleted: true` in each block’s data. The frontend requests authenticated snapshots and item pages with `includeCompleted=false`; the API omits completed tasks only for blocks with this preference enabled. Columns remain present even if every card is complete. A small `taskSummary` reports omitted completion counts, so progress remains accurate without transferring completed task text. Empty lists/columns show “All tasks done. Add a new one!” and filtered blocks offer “Show all tasks”. Turning the filter off fetches omitted tasks with a revision check before saving `hideCompleted: false`; loading failures leave the filter enabled. Viewers can change the display locally without writing to the board.

Partial writes set `preserveCompletedTasks` on the item. The backend merges stored completed entries by ID before validating the complete payload and applying the existing board/item revision checks. Deleting a column explicitly deletes its hidden cards; deleting a block uses the existing soft-delete/trash behavior. Full writes can delete or reopen completed tasks. Completed entries are appended after visible entries when merging. Copy/paste and duplication fetch omitted tasks before cloning. Export explicitly requests complete snapshots, so archives retain every task. Public shared boards retain their existing complete read-only payload.

This reduces API payload and client rendering cost; the backend still reads each block's JSON from storage. Tasks are not separate database rows. Loading more tasks can therefore increase rendering work again, intentionally.

## Recovery and loading boundaries (2026-10-21)

HTTP startup defers mock/demo implementations; mock mode awaits its composition module before mounting. Import validation loads its persistence validator on demand. Root, screen, and block error boundaries offer local retry and an explicit save-before-reload action. Failed or still-pending registered saves cancel reload. Pending workspace/appearance guards survive failed-screen unmounts until successfully flushed, including unload protection; local uncommitted form/editor state is outside this guarantee.

Project metadata requests are independent of local save status. Persisted project identity and remote revisions refresh board/participant metadata; sharing changes explicitly refresh participants. Abort signals and identity-scoped state reject obsolete responses after switching projects.

`npm run benchmark:projection` measures snapshot-to-view conversion without browser rendering. A local 2,000-note fixture with comments/tags improved from 219.28 ms to 11.06 ms median after indexing relations; see the frontend review for fixture, p95, and limitations. Simple-block culling and a CPU-throttled production-browser study are now implemented; mixed-board and physical-device studies remain outstanding.

## Canvas model benchmark and remaining rendering work

`npm run benchmark:canvas-model` compares the former per-frame lock scans and separate search passes with the extracted model calculations. A local 2,000-item/200-frame notes/document fixture measured frame-lock medians of 6.173 → 0.077 ms and search medians of 8.863 → 3.667 ms (five warmups, 20 samples). The script checks result equivalence before measuring. These numbers describe Node calculation cost, not browser frame rate; see the frontend review for p95 and smaller fixtures.

Regression coverage includes frame ownership/lock release, nested columns, deep/cyclic references, transient connection geometry, query compatibility, stable paint order and nested/explicitly selected frame dragging with one final batched commit. Backend ownership validation is unchanged.

The editable canvas now culls notes, text, icons, images, links and drawings with 320 screen pixels of overscan. Current source-identity measurements protect auto-sized content; active selections/focus, drag overrides, remote attendance, search matches and dialog targets stay mounted. Nested scroll offsets survive culling. Stateful editors, custom CSS, frames, section titles and curves retain their mounted state. Exact zoom is limited to scale-aware UI, and memoized item/frame components skip camera-only work. Overflow checks share an animation-frame read/write batch instead of synchronously measuring every dirty item. See [BROWSER_PERFORMANCE.md](BROWSER_PERFORMANCE.md) for browser regressions, the corrected before/after comparison, and remaining limits.
