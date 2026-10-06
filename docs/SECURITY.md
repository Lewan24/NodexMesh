# Security posture

Updated for the MFA and session changes on 2026-10-06. This is an implementation review, not a penetration test or a guarantee that a particular deployment is secure.

## Implemented controls

### Authentication and sessions

- ASP.NET Core Identity password hashing; minimum 12 characters with upper/lowercase, digit, and symbol requirements.
- Lockout after five failed attempts for 15 minutes and IP-based authentication limits.
- Fifteen-minute signed JWT access tokens with issuer/audience/lifetime/signature validation.
- Rotating random refresh tokens stored hashed in PostgreSQL and sent only in an HttpOnly cookie. Reuse detection revokes active sessions for the account.
- Blocked-account and current global-role checks against the database during JWT validation, so stale tokens cannot preserve removed access.
- Profile/password changes and administrator identity/role/password operations revoke affected sessions as appropriate.
- Bootstrap administrator requires a configured password; credentials are never printed.

Opt-in MFA supports authenticator apps and email codes, with single-use recovery codes. Email verification and self-service password recovery are available when global email delivery is enabled. Administrators can reset passwords; password resets retain MFA. There is no invitation acceptance flow.

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
- Open registration has no CAPTCHA and can be abused without edge controls. Email ownership verification requires global email delivery; accounts are auto-confirmed while email is disabled.
- Account deletion has a retention/recovery lifecycle (see `account-deletion.md`). A comprehensive GDPR data export is not implemented; email alerts require configured delivery.

## Production checklist

- Use TLS end to end at the public edge; restrict internal frontend/API/database ports.
- Configure exact trusted proxies and verify client-IP attribution with forged-header tests.
- Store secrets outside repository/stack YAML where possible and rotate them operationally.
- Separate migration, runtime, audit-read, and retention privileges; protect backups and immutable logs.
- Pin images/dependencies, scan npm/NuGet/container artifacts, and monitor advisories.
- Back up and restore-test PostgreSQL and media storage.
- Configure alerting for audit persistence failures, token reuse, authentication/403/404/429 spikes, disk pressure, and detection lag.
- Perform deployment-specific threat modeling, automated browser security tests, and a penetration test before high-risk public use.


## MFA protections and operational requirements

MFA is opt-in. Email is the initial preferred method when delivery is globally available; authenticator enrollment is available independently of SMTP. Authenticator tokens follow [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238): SHA-1, six digits, a 30-second period, and a one-step clock-drift window. Provisioning supports a locally generated QR code, a manual Base32 key, and an `otpauth://` URI compatible with standard authenticator apps. Accepted TOTP steps must increase, preventing reuse across concurrent challenges.

Threat controls follow the [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html) and [Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html): verify password before challenges; verify the existing factor before changing/disabling MFA; prove a newly selected factor; enforce per-IP throttling plus persisted account lockout; use generic failure responses; and invalidate sessions after security changes. This is an implementation assessment, not an OWASP certification or penetration test. Email MFA inherits the security of the mailbox; TOTP does not provide phishing resistance.

A 256-bit random challenge bearer is stored only as SHA-256. Email codes use cryptographic randomness, five-minute expiry, single use, and a protected hash bound to the challenge token. Outbox bodies containing codes are encrypted by the existing outbox payload protector. Authenticator seeds and pending setup seeds are encrypted with ASP.NET Data Protection under a dedicated purpose. Recovery codes have 80 bits of randomness, are stored only as user-bound SHA-256 hashes, and are consumed with optimistic concurrency checks. Challenge consumption, attempts, recovery consumption, and accepted TOTP steps use concurrency tokens. A successful proof is durably consumed before session/settings issuance; if issuance fails, start a new challenge rather than replaying the proof. Settings writes and session replacement are transactional.

Persist and protect the Data Protection key ring, share it between API instances, and synchronize server clocks. Losing keys prevents decrypting enrolled seeds and pending messages. Never log, export, or expose seeds, challenge tokens, codes, or recovery codes. Existing audit capture records property names and safe metadata, not credential values. MFA changes are recorded as `auth.mfa_changed`; completed logins record the selected authentication method; failed MFA proofs record `auth.mfa_failed` with the account identifier when available. Expired challenges are deleted by hourly cleanup; pending setup secrets are unusable after expiry.

When email is disabled, enrolled authenticators continue to work; email-only users must use a recovery code. MFA is never silently disabled. Users must store their recovery codes separately and securely. There is no unauthenticated factor-reset or administrator bypass endpoint; losing all factors and recovery codes requires an operational recovery process with independent identity verification. Email changes while MFA is enabled require verified MFA disable/re-enable, preventing replacement of the email factor using only a password and stolen session. Legacy refresh tokens without a security stamp cannot refresh an MFA-enabled account. New refresh tokens are bound to the current security stamp.


MFA change review against [OWASP Top 10:2025](https://top10.owasp.org/2025/):

| Area | Controls applied in this change |
| --- | --- |
| A01 Access control | Authenticated settings, caller-bound management challenges, no access token before second-factor proof. |
| A02 Configuration | Email gated by effective global configuration; persistent key-ring and synchronized-clock requirements documented. |
| A03 Supply chain | Updated test SQLite provider/bundle to remove the reported vulnerable native dependency; npm install audit reported zero vulnerabilities; committed dependency lockfile. |
| A04 Cryptography | Random challenges/recovery codes, protected seeds and email payloads, stored hashes, constant-time OTP comparison. |
| A05 Injection | Validated method/code/width DTOs, EF parameterized queries, template renderer escaping. |
| A06 Design | Existing/new factor proof, expiry, single use, replay prevention, recovery codes, lockout across challenges. |
| A07 Authentication | Password verification, account/IP throttling, generic invalid-proof responses, session security-stamp binding and revocation. |
| A08 Integrity | Committed migrations/snapshot, optimistic concurrency, transactional settings/session replacement, PostgreSQL integration coverage. |
| A09 Logging and alerts | Factor changes, failed MFA proofs, and completed sign-ins audited without credential values; existing admin incident review and email delivery controls apply. |
| A10 Exceptional conditions | Invalid/expired/concurrent proofs fail closed; attempted proofs are consumed before issuance; settings/session transactions roll back on failure; SMTP disable never bypasses MFA. |

Authenticator provisioning URIs and their QR images are generated locally; the secret is never sent to an external QR service. No user-supplied provisioning URL is fetched by the server.
