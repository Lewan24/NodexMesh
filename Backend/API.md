
## Project retention and comment permissions

Projects have three administrative statuses: `active`, `trashed`, and `userdeleted`.
`DELETE /projects/{id}` moves an owned project into user trash. The existing
`DELETE /projects/{id}/permanent` route now marks it as user-deleted: users and
collaborators lose access, but the data remains recoverable by administrators.
User restore is limited to projects still in user trash.

`POST /admin/projects/{id}/restore` restores either inactive state to active.
`DELETE /admin/projects/{id}/permanent` irreversibly removes an inactive project
and its contents. Owner/member changes return 409 for inactive projects.
Administrative project records include `status` and `userDeletedAt`.
The hourly cleanup service removes at most 100 projects per run once they have
been user-deleted for 30 days; projects left in user trash are not automatically removed.

`PUT /boards/{boardId}/items/{itemId}/comments` accepts `expectedBoardRevision`
(as a decimal string), `upserts` (`id`, `text`, `status`), and `deletes` (comment IDs).
It returns an updated board snapshot. Commenters may add comments and change or
delete their own comments; Editors/Owners may manage all comments. Viewers cannot
write comments. Canvas mutations still require Editor access.

Resetting global appearance removes the stored profile. `GET /appearance` then
returns `defaults: null`, which the frontend resolves using `defaultAppearance`
in `appearanceModel.ts`. Project override resets remain independently scoped.
