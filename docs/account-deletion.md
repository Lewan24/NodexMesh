# Account deletion

Apply the `AddAccountDeletion` EF migration before running the updated API. It adds nullable deletion-request and security-notice acknowledgement timestamps to users. Existing users need no backfill. The updated access-token validation requires a security stamp, so existing sessions will refresh their token or sign in again after deployment.

Profile → Delete account loads every owned project, including trashed and user-deleted projects. The user must choose permanent deletion or transfer to an active existing collaborator for each project, enter their current password and confirm the consequences. The server validates the complete project set and applies all changes in one serializable transaction. Invalid or stale decisions leave everything unchanged.

Project deletion in this flow is permanent immediately. Transfers retain the project's current trash/deletion status. The departing user is removed from all project memberships, their default-project claim and project appearance overrides are removed, all refresh tokens are revoked, and the account is blocked. The last active administrator cannot delete their account.

The existing hourly `ExpiredDataCleanupService` removes up to 100 accounts whose deletion request is at least 90 days old. It starts one minute after startup and retries on the next cycle after failures. Ordinary administrative blocks never start this countdown. Account cleanup removes the identity record, Identity dependent records, refresh tokens, appearance settings, memberships and idempotency records. Project decisions have already been completed; cleanup refuses to remove an account that still owns a project.

Administration → Users shows the scheduled deletion date and offers Restore account or Delete permanently. Restore cancels the countdown and unblocks the account; it does not reverse project decisions or restore memberships. Old sessions remain invalid. Administrators can also permanently remove ordinarily blocked accounts, after resolving any owned projects through the project administration panel. Permanent removal is irreversible.

Public registration requires `acceptSecurityNotice: true`; the server stores the acknowledgement time. The notice appears on both registration and profile pages in English and Polish. Security audit records follow the existing independent audit-retention configuration. Content and historical author identifiers in transferred/shared projects are preserved. Files belonging to deleted projects become inaccessible immediately and are reclaimed by the existing orphan-file cleanup after its safety grace period.

API routes:

- `GET /api/v1/auth/account-deletion`: owned projects and eligible collaborators.
- `POST /api/v1/auth/account-deletion`: `{ currentPassword, projects: [{ projectId, action: "delete" | "transfer", newOwnerId: null | userId }] }`.
- `POST /api/v1/admin/users/{userId}/restore`: cancel pending account deletion.
- `DELETE /api/v1/admin/users/{userId}/permanent`: remove a blocked account with no owned projects.
