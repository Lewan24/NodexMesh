# Collaboration, saving, and recovery

## Current write path

1. The frontend batches durable edits after 250 ms from the first change and spaces HTTP mutations by at least 1.1 seconds to stay within 60 mutations/minute/user.
2. Dragging keeps frame-scheduled temporary geometry outside persisted project state and commits final positions in one board update on release.
3. A board mutation sends changed items/deletions, expected board/item revisions, and a stable mutation ID.
4. The API validates access, revisions, presence locks, references, schemas, and graph integrity and commits the mutation plus idempotency/audit data transactionally.
5. After commit, the API publishes `BoardChanged(projectId, boardId, revision)` through SignalR. Other clients coalesce the hint into an authorized HTTP synchronization read.
6. Periodic polling remains the reconciliation fallback for missed notifications, reconnects, changes from routes that do not publish a hint, and authorization changes.

A SignalR message is never authoritative data. The following HTTP request rechecks access and returns the current database snapshot.

## Presence

Authenticated members join one project group after a Viewer-level database permission check. The browser publishes selected/editing item IDs and optional board-space cursor coordinates, throttled on both client and server. The server supplies the display name, limits payloads to 50 items, and expires entries after 15 seconds.

Only active Editor/Owner editing presence locks an item against a conflicting board mutation. Viewer/Commenter selection does not lock it. Presence is advisory and in memory; revision checks remain the durable concurrency boundary. It is never exposed by public links or written into board revisions.

## Merge and recovery

The frontend merges independent remote changes against the last confirmed snapshot. A stale revision triggers a fresh read and bounded rebase/retry with a new mutation ID; transport retry of an unacknowledged request retains the original ID.

If the same field changed on both sides, an edited item was deleted, relationships cannot be combined, or repeated contention prevents saving, the browser stores an account- and tab-scoped recovery draft in local storage before adopting the shared snapshot. The save status UI can download or delete those drafts. Storage failure leaves the unsaved version visible with manual recovery controls.

Incoming remote state is rebased into local undo history so undo does not reverse another user's work. Board switching and logout wait for pending writes and expose errors instead of silently discarding them. Comment writes use the same board-revision conflict boundary.

## Scaling limits and next work

- SignalR groups and `PresenceRegistry` are single-process. Multiple API replicas require a Redis backplane/Azure SignalR **and** distributed presence/lease storage; a backplane alone is insufficient.
- Board invalidation still results in snapshot/revision reads. A bounded revision change feed could reduce full-board transfers, but needs cursor expiry, permission checks, idempotent replay, and snapshot fallback.
- Same-property conflicts are intentionally preserved for user recovery, not silently resolved. Concurrent rich-text editing would require a deliberately designed CRDT/OT model and migration/history semantics.
- The whole-board revision gate can reject independent writes. Relaxing it requires concurrent transaction tests for parent/frame deletion, links, tags, comments, and other graph changes.
- Interactive writes remain synchronous. A message broker would not decide merge semantics; use a transactional outbox only for genuinely asynchronous background work.

Measure save latency, conflict/rebase rates, 409/429 responses, polling/SignalR traffic, and snapshot bytes with multiple real clients before changing these boundaries.
