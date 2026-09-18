# Performance and collaboration review

## Implemented

- Authenticated SignalR presence hub: collaborators join only after project access is checked; server-derived display names, 50-item payload cap, one heartbeat per second per connection, 15-second TTL, disconnect cleanup, and no persistence in board revisions. The frontend sends selection presence and detects an active text editor as `editing`.
- Save scheduling: batch 250 ms from the first edit instead of debouncing 1,100 ms after the last edit. Continuous typing now reaches the save queue. The existing 1,100 ms write spacing remains because the API allows 60 mutations per minute per user.
- Active authenticated project polling: 1,500 ms plus request duration, previously 2,000 ms. Project metadata and board revision checks run concurrently. Hidden-tab pause, reconnect backoff, role checks and conflict preservation remain.
- Untagged mutations skip the full-board GET previously used only to resolve tag names. They still reload the acknowledged snapshot after saving; tagged edits retain fresh tag resolution and idempotent retries.
- Canvas LOD: below 30% zoom, already measured inactive blocks use lightweight type previews. Selection, focus, dragging, drop targets and search keep full content. Lines, drawings and section titles retain their visuals. Cached dimensions preserve attachment geometry. This is an initial editor-canvas optimization, not viewport virtualization or read-only LOD.
- Backend snapshot relation queries use a board-scoped SQL subquery rather than shipping a potentially large array of item IDs back to PostgreSQL.

## Remaining limits and priorities

### 1. Push notifications and incremental synchronization

Current synchronization still polls; these changes reduce scheduling delay but do not provide real-time streaming. Add authenticated SignalR or SSE board-revision notifications after transaction commit. Reuse the existing authorized read/merge path when notified, coalesce bursts, and retain slow polling as a fallback. Handle reconnect gaps with a revision cursor. Recheck access on subscription and permission changes; do not broadcast private comments to public viewers. Multi-instance deployments need a shared backplane or durable outbox, not an in-memory event bus alone.

Then introduce a bounded revision change feed containing item upserts, deletions, links, tags and comments. Support snapshot fallback when cursors expire, idempotent replay and atomic mutation acknowledgements. This removes full-board downloads after each mutation and remote revision change. Preserve the current conflict handling until field-level semantics are explicitly designed.

### 2. Rendering and geometry

LOD currently measures blocks on first mount and remounts full content when zooming in. Public previews still render full blocks. Share a renderer and geometry cache, then add viewport culling with overscan and a spatial index. Keep selected/focused/editing items mounted, and keep line endpoints and curved-line bounds correct when targets are offscreen. Invalidate cached sizes after remote content/font changes. Benchmark expensive documents, highlighted code, diagrams and large nested columns separately. Consider hysteresis around LOD thresholds and lightweight content thumbnails rather than type-only previews.

Avoid simply removing DOM elements without preserving geometry: auto-height blocks and connection endpoints depend on ResizeObserver measurements. Auto-growth layout also runs from measurement changes and must not interpret virtualization as a content resize.

### 3. Server and rate limits

The global limit is 300 requests/minute/user and mutation limit is 60/minute/user. Faster polling consumes more of that budget, especially with several tabs, tagged edits or conflicts. Do not reduce polling intervals further without reducing requests; coordinate tabs or use push notifications. Replace fixed retry headers with limiter-provided retry times in a separate transport change.

Profile snapshot and mutation SQL with EXPLAIN ANALYZE on representative large boards. Snapshot reads comprise several sequential queries; do not parallelize EF operations on the same DbContext. Evaluate a consistent read transaction if mixed revisions during concurrent commits are observed. Review mutation full-board validation cost, lazy project loading (startup currently loads every project board), and bounded/paginated public reads. Keep authorization checks and tombstone semantics intact.

### 4. Concurrent editing semantics

Three-way merging supports independent edits but same-property conflicts still need resolution. For concurrent text editing, evaluate a CRDT model and migration strategy, history semantics and persistence before changing conflict handling. Separate ephemeral cursor/drag presence from durable writes; presence can update rapidly without spending the mutation budget.

For selection presence, the recommended event is `{ projectId, boardId, userId, displayName, itemIds, mode, expiresAt }`. Broadcast it over the authenticated push connection with a short heartbeat and a server-side TTL. Render another user's item IDs with a distinct outline and a small name badge; keep the local selection controls unchanged. Clear presence on blur, disconnect, project switch and permission revocation. Do not persist this state in board revisions or expose it through public share links. A durable “currently editing” lock should only be added later if product rules define conflict behavior for stale locks and multiple selected items.

## Validation and measurements

Both application builds and frontend regression tests should pass. The new HTTP regression verifies that untagged saves perform POST then GET, without a pre-save board download. Backend persistence smoke tests exercise real snapshot relation queries using a temporary database schema.

Before claiming quantitative speedups, record p50/p95 edit-to-remote-render latency, requests and bytes per edit, conflict rate, React commit duration, frame time and heap size for 100/1,000/5,000 items and 2/5/10 collaborators. Exercise zoom transitions, selected/focused editors, remote auto-height changes, reconnection, permission revocation and multiple tabs. No browser FPS or end-to-end collaboration benchmarks were collected during this change.
