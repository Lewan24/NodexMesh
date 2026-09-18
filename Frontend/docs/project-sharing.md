# Project sharing

Open a saved project and select **Share** in the app bar. Sharing requires HTTP mode; it is unavailable for local mock projects.

Owners can share with an existing account by email, change collaborator roles, and remove access. Shared projects appear in the recipient's project list. Editors can edit the board and rename it. Only owners can trash projects or manage public links. Viewer and Commenter roles use a read-only board; the current API does not support separate comment writes. Collaborators can leave through the Share dialog.

The open project checks for updates automatically every two seconds after the previous check completes. It reads lightweight board revisions before downloading changed content; no manual refresh is needed for other users' saved edits. Public viewers refresh every three seconds. Hidden tabs pause checks and reconnect on return; transient failures back off and display a reconnecting status. This uses the existing HTTP API, so no websocket service or backend deployment is required. The existing save debounce means edits are shared after they are saved, rather than broadcasting every pointer movement or keystroke.

Independent edits (including different fields of an item) merge with pending drafts. Simultaneous writes with stale board revisions are rebased and retried with fresh mutation IDs. Conflicting changes to the same field, deletion versus editing, or invalid combined relationships stop autosaving and preserve the local draft for download. Incoming changes are rebased into undo history so undo cannot revert another user's work. **Refresh** remains available to reload the project list or discover newly shared projects.

Owners can create public links with an optional label and expiry. Copy the generated URL before closing the dialog: the API returns its token only once. Previously created links can be revoked, but their URLs cannot be retrieved. Link usage is labeled last used rather than views.

`/shared/{token}` opens without authentication, including when the viewer is already signed in. It loads only the public endpoints and displays a board selector when necessary. On desktop the viewer supports left/middle-button dragging, cursor-centered wheel/pinch zoom, arrow-key panning, and +/- zoom when the board has focus. Touch devices retain native scrolling and zoom buttons. Camera changes are batched per animation frame and reuse memoized block visuals. The viewer preserves the owner's appearance, and has no canvas mutation/history/clipboard hooks. Public payloads exclude comments and user identifiers. Unavailable, expired, revoked, and deleted-project links share the same unavailable message.

## Hosting

The frontend host must serve `index.html` for `/shared/*` (or the configured Vite base path plus `shared/*`), while forwarding `/api/*` to the API. Deploy the existing backend share-link migration before using this feature.

## Verification

Run `npm test`, `npm run build`, and `npm run format:check` from `Frontend`. Sharing regressions cover anonymous transport, member and link requests, public nested-board projection, invalid item scope, and role-based local write restrictions. Collaboration tests additionally cover concurrent saves, pending drafts, deletions, same-field conflicts, in-flight edits, reconnects, aborted reads, lightweight revision checks, safe undo, and cursor-centered zoom.

For a browser check with a running API:

1. Share an owned project with a second account as Editor; refresh that account's projects and save an edit.
2. Open the same project in both accounts. Edit separate blocks simultaneously and verify both changes appear automatically. Change the second account to Viewer and verify that editing controls disappear after the next check.
3. Create a public link, open it in a signed-out window, and inspect content, nested blocks, connections, desktop dragging, touch scrolling, and cursor-centered zoom.
4. Revoke the link with the public page still open; verify it automatically shows the unavailable message.
5. Disconnect and reconnect the network; confirm the reconnecting indicator clears without discarding local edits. Edit the same field in both accounts and verify conflict recovery offers a draft download instead of silently overwriting content.
