# Findings outside the audit integration

These findings preserve the application's existing security policies unless noted.

- Refresh replay revokes all currently active refresh tokens for an account. There is no token-family identity or browser concurrency grace period. A late legitimate request can trigger this policy. Optimistic concurrency now prevents two writers from consuming the same active token; it does not prove whether a later replay represents theft. Account-wide revocation and access-token lifetimes remain unchanged.
- The frontend Nginx configuration replaces the external HTTPS scheme with its own HTTP scheme. The public frontend port must be restricted to the trusted TLS proxy, and that proxy chain must be configured explicitly. The audit implementation supplies application trust settings but does not invent or deploy network addresses. Deployment instructions are in APPLICATION_AUDIT.md.
- Existing database credentials are shared by runtime operations, startup migrations and retention. Role separation/immutable archives require operator deployment work. Audit APIs have no end-user delete/edit endpoints, but a compromised database owner can modify evidence.
- The test dependency graph emits NU1903 for SQLitePCLRaw.lib.e_sqlite3 2.1.11 (GHSA-2m69-gcr7-jv3q). This is an existing test-provider dependency; dependency upgrades were not included in this logging task.

Necessary integration changes: new administrator creation requires a supplied secret instead of printing a generated password, refresh consumption gains optimistic concurrency protection, and exception/request logging avoids retaining raw capability-bearing paths or exception messages. Existing API response DTOs and permission policies are preserved.
