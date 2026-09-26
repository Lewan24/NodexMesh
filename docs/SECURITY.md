# Security posture

Reviewed against the code on 2026-09-24. This is an implementation review, not a penetration test or a guarantee that a particular deployment is secure.

## Implemented controls

### Authentication and sessions

- ASP.NET Core Identity password hashing; minimum 12 characters with upper/lowercase, digit, and symbol requirements.
- Lockout after five failed attempts for 15 minutes and IP-based authentication limits.
- Fifteen-minute signed JWT access tokens with issuer/audience/lifetime/signature validation.
- Rotating random refresh tokens stored hashed in PostgreSQL and sent only in an HttpOnly cookie. Reuse detection revokes active sessions for the account.
- Blocked-account and current global-role checks against the database during JWT validation, so stale tokens cannot preserve removed access.
- Profile/password changes and administrator identity/role/password operations revoke affected sessions as appropriate.
- Bootstrap administrator requires a configured password; credentials are never printed.

There is no MFA, email verification, invitation acceptance flow, or self-service email-based password recovery. Administrators can reset passwords.

### Authorization and data isolation

- Project access is centralized in `ProjectAccessService` and re-read from PostgreSQL rather than trusted from JWT claims.
- Owner, Editor, Commenter, and Viewer checks apply at route and service boundaries. Comments have a dedicated Commenter endpoint with own-comment enforcement.
- Board/project/library/share identifiers are resolved and scoped server-side. No-access resources generally return 404 to reduce existence probing.
- Public project DTOs omit comments and user identifiers. Public library access requires an explicit owner-created file token.
- Administrator routes require an admin claim that is also checked against current database state. Admin operations are audited.

### Input, integrity, and resource controls

- Strict DTO validation and strict per-item JSON deserialization reject unknown fields and unsupported schemas.
- Server validation covers item sizes/counts, finite geometry, references, nesting, URLs, relations, comments, and revisions.
- EF Core parameterizes normal queries. The limited direct SQL operations are parameterized/interpolated EF calls.
- Optimistic revisions, transactions, idempotency receipts, foreign keys/check constraints, and soft-delete filters protect mutation integrity.
- Uploads are streamed with file/project quotas, generated filenames, extension/signature checks, restricted static SVG parsing, and no execution from the storage directory.
- Global, authentication, refresh, mutation, and public-read rate limits return 429 without request queues.

### Browser and transport controls

- CORS is an explicit allowlist. The cookie-authenticated refresh route requires a custom request header.
- Production uses HTTPS/HSTS semantics and Secure refresh cookies; local Development intentionally permits HTTP.
- Security headers include restrictive CSP on API responses, no framing, no referrer, MIME sniffing protection, and no-store on authenticated API data.
- Forwarded headers are disabled unless exact proxies/networks are configured. Audit/auth/rate-limit code uses only the validated remote address.
- OpenAPI/Scalar is Development-only; exception responses do not expose stack traces.

### Audit and monitoring

- Authentication, authorization failures, mutations, administrator access, role/ownership changes, public/library sharing, and HTTP failures generate structured audit events.
- Transactional changes and their audit records commit together. Security incidents are detected from persisted history and reviewed in the admin UI.
- Retention and cleanup are bounded background jobs. Critical console fallback and audit persistence-failure counts expose standalone-event failures.

## Important limitations

- Application rate limits and SignalR presence are process-local. Multiple API replicas require distributed equivalents.
- Symmetric JWT signing is suitable for the current single API; split services should use asymmetric signing and scoped audiences.
- The runtime principal currently also performs migrations and audit retention in the supplied Compose files. Stronger production separation must be deployed by the operator.
- Standalone audit writes can be lost during a database outage/process crash; durable container logging and external immutable retention are not provided by the application.
- Project public links are bearer URLs returned once; library public links are retrievable stable aliases. Anyone holding either URL can access its scoped public content until expiry/revocation/deletion.
- SVG validation is a restrictive parser, not malware scanning. Video is not transcoded. External URLs are rendered by browsers; the API does not fetch them and therefore avoids an SSRF service today.
- Open registration has no CAPTCHA/email ownership verification and can be abused if exposed without edge controls.
- Account deletion/GDPR export and automatic alert delivery are not implemented.
- The current test-only SQLite dependency graph reports NU1903 for `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 (GHSA-2m69-gcr7-jv3q). It is not referenced by the PostgreSQL production API, but the test dependency should be upgraded.

## Production checklist

- Use TLS end to end at the public edge; restrict internal frontend/API/database ports.
- Configure exact trusted proxies and verify client-IP attribution with forged-header tests.
- Store secrets outside repository/stack YAML where possible and rotate them operationally.
- Separate migration, runtime, audit-read, and retention privileges; protect backups and immutable logs.
- Pin images/dependencies, scan npm/NuGet/container artifacts, and monitor advisories.
- Back up and restore-test PostgreSQL and media storage.
- Configure alerting for audit persistence failures, token reuse, authentication/403/404/429 spikes, disk pressure, and detection lag.
- Perform deployment-specific threat modeling, automated browser security tests, and a penetration test before high-risk public use.
