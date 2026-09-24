You are a senior .NET backend engineer and application security engineer working in an existing production-oriented repository.

TASK: Design and implement a complete, reliable, production-ready audit logging, security event logging, and administrative security monitoring system.

Technology:
- Backend: C# and ASP.NET Core / .NET 10
- Frontend: React + Vite
- Database: PostgreSQL
- Deployment: Docker behind an HTTPS reverse proxy
- Existing application: a platform for designing and managing projects, applications, games, systems, resource sharing, and collaboration.

Important: This is an implementation task, not a proposal or a theoretical design document. Inspect the repository, implement the necessary changes, integrate them into existing features, and test them. Preserve existing architecture and naming conventions wherever sensible.

CRITICAL IMPLEMENTATION REQUIREMENTS AND SCOPE

This repository contains an existing, fully functional application. The API, frontend, authentication, database integration, project management and collaboration functionality already work.

Your task is to INTRODUCE a comprehensive logging and auditing system into the existing application.

There is currently no complete application-wide logging implementation in the API. You must actively find and instrument the appropriate existing endpoints, services, middleware, authentication flows, and business operations.

These instructions override conflicting requirements elsewhere in this prompt.

1. PRESERVE THE EXISTING APPLICATION

Do not unnecessarily refactor, redesign, replace or rebuild any currently functioning subsystem.

In particular, preserve existing authentication, refresh token behavior, authorization, API response contracts, frontend architecture and database conventions.

If you identify a security issue that requires changes beyond logging and auditing, document it separately. Only modify existing security behavior when strictly necessary for correct and safe integration. Clearly describe any such modification.

Do not stop after creating database tables, middleware, services or abstractions. Actually integrate the logging system into relevant existing application operations.

2. CONSOLE AND DOCKER LOGGING

Implement structured application logging using Microsoft.Extensions.Logging and preferably the existing logging infrastructure.

Reuse existing providers or dependencies when suitable. Do not introduce additional logging frameworks without a clear reason.

Important application events must appear in the API console with appropriate log levels.

Use structured message templates rather than string interpolation for structured logging.

Include timestamps, event identifiers, useful event context, trusted client IP where relevant, user identifiers where available, and request correlation identifiers.

Recommended production behavior:
- Information: significant successful operations and important application lifecycle events.
- Warning: failed authentication, authorization violations, suspicious requests and recoverable problems.
- Error: failed application operations, exceptions and significant infrastructure failures.
- Critical: severe failures affecting security or application availability.
- Debug/Trace: verbose diagnostics, disabled by default in production.

Avoid logging every ordinary successful GET request.

Do not generate excessive duplicate logs for the same exception or event.

Ensure application console output works correctly with Docker stdout/stderr collection and can be inspected using docker logs.

Support configurable log levels through the existing application configuration.

Never write authentication secrets, raw access tokens, raw refresh tokens, passwords, session cookies, database credentials or confidential project contents into console output.

3. POSTGRESQL APPLICATION AUDIT DATABASE

Implement dedicated PostgreSQL storage for important APPLICATION security and business audit records.

These tables belong to the existing application database.

They are not PostgreSQL server diagnostic logs.

Follow the existing ORM, database access and migration conventions.

Security audit records must cover successful and unsuccessful logins, security-sensitive token activity, authorization violations, relevant suspicious HTTP requests, administrative operations and detected incidents.

Activity audit records must cover important project operations, sharing, invitations, ownership changes, collaboration and other sensitive business operations actually present in the repository.

Ensure these events are persisted with suitable actor information, timestamps, trusted client IP, outcomes and safe contextual metadata.

Avoid inserting all console messages into PostgreSQL. Store important audit events and selected serious diagnostic failures only.

Console logs and database audit events may describe the same important action, but they serve different purposes and should not be implemented as indiscriminate duplicates of each other.

4. ADMINISTRATIVE AUDIT INTERFACE

Extend the existing administration panel rather than creating a separate frontend application.

Use existing React components, routing, styling, authentication and authorization patterns.

Implement the necessary backend endpoints and frontend views for investigating application audit records.

The administrator must be able to investigate successful logins, failed logins, suspicious account activity, security incidents, project operations and collaboration changes.

Use server-side filtering, sorting and pagination.

Enforce all administrator permissions on the backend.

5. POSTGRESQL SERVER LOGGING IS OUT OF SCOPE

Do not implement, modify or automatically configure PostgreSQL's internal server logging.

Do not change PostgreSQL logging settings in Docker Compose, database container startup commands, postgresql.conf or database initialization scripts.

Do not add pgAudit automatically.

Instead, create a separate Markdown documentation file intended for system administrators, such as docs/POSTGRESQL_LOGGING.md.

The document should explain:
- The difference between application audit records and PostgreSQL server logs.
- How PostgreSQL server logging can be configured manually.
- Recommended categories of diagnostic information.
- How to investigate slow queries, database errors and connection problems.
- Sensible production logging settings and the risks of excessive statement logging.
- Log rotation, retention, storage limits and access permissions.
- The relationship between PostgreSQL logs and Docker logging.
- Which configuration changes require a PostgreSQL restart.
- How administrators can verify that the manual configuration works.

Do not apply the documented configuration automatically.

6. CLIENT IP REQUIREMENTS

The production API runs in Docker behind an HTTPS reverse proxy.

Investigate the existing deployment configuration and implement centralized trusted client IP resolution.

Configure ASP.NET Core Forwarded Headers Middleware securely.

Accept forwarded headers only from explicitly configured trusted proxies or trusted networks.

Never blindly trust client-supplied X-Forwarded-For values.

Where possible, store the genuine IPv4 client address. Normalize IPv4-mapped IPv6 addresses. Support genuine IPv6 addresses rather than inventing an IPv4 address.

Use the same trusted IP resolution service in authentication, audit logging, HTTP security logging and important business operations.

Do not guess an IP address when it cannot be reliably established.

7. INTEGRATION AND DELIVERY

This is a complete integration task.

Inspect the repository before implementing anything, identify the existing architecture, and develop a concise implementation plan.

Then implement the necessary backend services, database schema, migrations, middleware integration, application-level audit hooks, administrative endpoints and React administration components.

Ensure appropriate failure handling, data sanitization, retention configuration and performance safeguards.

Do not add unnecessary external infrastructure.

Implement automated tests, run available builds and verify integration.

If production-specific reverse proxy values or other infrastructure details cannot be determined from the repository, make them explicitly configurable and document the required deployment values instead of inventing them.

Do not automatically modify production infrastructure when reliable configuration details are unavailable.

At completion, explain precisely:
- What was implemented.
- Where logging was integrated.
- Which events appear in the console.
- Which events are persisted in PostgreSQL.
- What administrators can investigate.
- Which migrations must be applied.
- Which application configuration values must be supplied.
- How to verify correct trusted client IP resolution in production.
- Which tests passed.
- Which requirements remain incomplete, if any.

Prioritize a working, secure and maintainable implementation that fits the existing application.

PHASE 1: REPOSITORY INVESTIGATION

Before changing code, inspect:
- Program.cs and the ASP.NET Core middleware pipeline.
- Authentication, login, token issuance, refresh token storage, rotation, revocation, and logout.
- Authentication and authorization handlers, existing rate limiting, and current exception handling.
- Project creation, modification, deletion, restoration, ownership, sharing, and collaboration.
- Administrative roles, permissions, API endpoints, and frontend administration screens.
- PostgreSQL database schema, ORM, migrations, indexes, and existing logging infrastructure.
- Docker and reverse proxy configuration, including forwarded headers, HTTPS termination, and networking.
- Existing frontend data access patterns, pagination, notifications, and component conventions.

Identify existing solutions that should be reused. Do not introduce duplicate logging frameworks, inconsistent database access patterns, or parallel authentication implementations.

Produce a brief architecture assessment and implementation plan, then execute the plan. Do not stop after planning.

PHASE 2: LOGGING ARCHITECTURE

Implement three cooperating logging layers:

1. SecurityAudit: security-relevant authentication events, authorization violations, token events, suspicious HTTP requests, account-security modifications, administrative activity, and security incidents.

2. ActivityAudit: important user and project operations, including creation, deletion, sharing, invitations, collaboration changes, ownership changes, and important modifications.

3. TechnicalDiagnostics: structured application logs for exceptions, infrastructure errors, middleware problems, performance issues, and ordinary technical diagnostics.

Security and activity audit events must be stored in PostgreSQL. Technical logs should integrate with the existing ILogger / structured logging solution and existing production log collection. Persist selected important technical errors in PostgreSQL, with appropriate safeguards against recursive logging failures.

Do not store every successful HTTP request in PostgreSQL.

Implement reusable audit services, event contracts, centralized event definitions, IP resolution, sanitization, and event persistence. Ensure the implementation can be extended without copying logging code throughout the entire application.

PHASE 3: POSTGRESQL SCHEMA

Design appropriate PostgreSQL audit storage using the project's existing ORM and migration conventions.

Prefer separate security_audit_events and activity_audit_events tables, or another clearly justified schema that offers equivalent separation.

Common audit fields should include:
- Unique event ID using the existing identifier convention.
- Occurrence timestamp in UTC, preferably timestamptz.
- Event type using stable machine-readable names.
- Event category.
- Severity.
- Outcome: success, failure, denied, blocked, etc.
- Authenticated actor/user ID, nullable for anonymous activity.
- Target user ID where applicable.
- Project ID where applicable.
- Resource type and resource identifier where applicable.
- Validated client IP using PostgreSQL inet.
- User-Agent with a reasonable maximum length.
- HTTP method.
- Sanitized HTTP route template.
- Status code.
- Trace ID and request/correlation ID.
- Optional session identifier or non-secret token family reference where appropriate.
- Controlled event-specific metadata using jsonb.
- Optional error code or safe exception classification.

Use foreign keys only where their lifecycle and deletion behavior cannot erase important audit history. Preserve necessary historical identifiers after deletion of users or projects according to the application's retention and privacy policies.

Never use cascading deletion that unintentionally destroys security audit history.

Implement useful indexes for timestamp, event type, severity, actor, target user, project, client IP, and common investigation filters. Use indexes appropriate to observed query patterns and avoid unnecessary indexes on every column.

Consider time-based partitioning if justified by the expected volume and existing database architecture. Do not introduce excessive complexity without measurable benefit.

All changes must use proper migrations. Do not use ad hoc database initialization or destructive schema changes.

PHASE 4: CLIENT IP RESOLUTION AND REVERSE PROXY SECURITY

Implement a centralized client IP resolver.

Production is deployed in Docker behind an HTTPS reverse proxy. Inspect the actual infrastructure configuration instead of assuming that RemoteIpAddress contains the public client IP.

Configure ASP.NET Core Forwarded Headers Middleware properly:
- Process forwarded headers before authentication, authorization, rate limiting, audit capture, HTTPS redirection, and other IP-dependent logic.
- Use explicit trusted proxy addresses or networks.
- Configure ForwardLimit according to the actual proxy chain.
- Support X-Forwarded-For and X-Forwarded-Proto where appropriate.
- Respect the actual reverse proxy's header behavior.
- Do not accept arbitrary forwarded IP headers from untrusted clients.
- Do not clear KnownProxies or KnownNetworks to blindly trust the public internet.
- Normalize IPv4-mapped IPv6 addresses into IPv4 when appropriate.
- Preserve genuine IPv6 addresses instead of manufacturing IPv4 addresses.
- Record null or a clearly identified unavailable IP when the address cannot be determined reliably.

Ensure external clients cannot directly bypass trusted proxy security assumptions. Document any required Docker networking or reverse proxy configuration.

Test direct requests, trusted proxies, untrusted proxies, spoofed forwarded headers, multi-proxy chains where applicable, IPv4, and IPv6.

All relevant security and activity events must use this centralized resolver.

PHASE 5: AUTHENTICATION AND SESSION AUDITING

Integrate auditing into the existing authentication implementation.

Capture:
- Successful login.
- Failed login, including attempted username/email where appropriate and legally permitted.
- Login to nonexistent accounts without introducing account enumeration vulnerabilities.
- Invalid credentials.
- Account lockout.
- Authentication rate limit rejection.
- Logout.
- Password change and reset events.
- Failed and successful account recovery events where applicable.
- MFA and recovery-code events if supported.
- Session revocation and logout-all-sessions where supported.
- Important security setting changes.

For successful logins, retain the account identifier, trusted client IP, timestamp, sanitized User-Agent, authentication method, and non-secret session reference when available.

For failed authentication, retain the supplied account identifier in a safely normalized, size-limited form where appropriate. Do not create different public responses that reveal whether an account exists.

Never record passwords, raw credentials, authentication cookies, verification codes, access tokens, or raw refresh tokens.

Preserve the existing authentication flow, error semantics, account lockout behavior, and external integrations.

PHASE 6: REFRESH TOKEN SECURITY

Inspect the current token architecture carefully.

If refresh token rotation already exists, integrate proper auditing into it.

If rotation is missing, assess the safest compatible implementation and introduce it only if necessary, without silently invalidating existing users or breaking current clients.

Capture:
- Successful refresh token rotation.
- Invalid token attempts.
- Expired token attempts where they can safely be classified.
- Revoked token attempts.
- Token reuse after rotation.
- Explicit session or token-family revocation.
- Concurrent refresh attempts that require special handling.

Never store raw refresh tokens in audit logs.

Use safe, non-secret token identifiers and token-family references where supported.

Ensure token rotation and reuse detection are concurrency-safe and atomic. Use the database's transactional and concurrency mechanisms to prevent multiple concurrent requests from consuming the same refresh token successfully.

Define how legitimate concurrent refresh requests are distinguished from confirmed or suspected token reuse.

When reuse is detected, generate a high-severity event, apply the existing or appropriately designed token-family revocation policy, and make the incident visible to administrators. Do not automatically claim that theft has occurred based on reuse alone.

Test concurrent refresh requests, replay of rotated tokens, expired tokens, revoked tokens, and token-family revocation.

PHASE 7: HTTP SECURITY AUDITING

Add centralized coverage for important HTTP failures and suspicious traffic.

Capture:
- Relevant 400 input-validation and malformed-request failures.
- 401 authentication failures.
- 403 authorization failures.
- 404 requests, particularly suspicious paths and repeated enumeration attempts.
- Unexpected HTTP methods and relevant 405 responses.
- 429 rate limiting rejections.
- Relevant suspicious redirects and abnormal redirect behavior.
- Unexpected 5xx errors.
- Requests blocked by existing application security mechanisms.

Preserve the existing API response contract.

Use the existing exception-handling architecture or appropriate ASP.NET Core exception handling, status-code handling, endpoint filters, and middleware.

Avoid duplicate audit entries when middleware and application services observe the same event.

Distinguish routing-level 404 responses from intentional application-level resource-not-found responses.

Do not classify every ordinary 404 or redirect as a security incident.

Avoid storing entire URLs, sensitive query parameters, request bodies, cookies, authorization headers, or arbitrary unfiltered headers.

Use normalized route templates when available. For unmatched routes, apply strict sanitation, length limits, and redaction before retention.

Account for errors rejected by the reverse proxy before reaching ASP.NET Core. Document and, where supported, integrate proxy-side logging or security-event forwarding. Do not claim that the application middleware can observe requests that never reach the application.

Exclude or aggregate routine health checks, expected static-resource misses, and other harmless noise without hiding meaningful attack patterns.

PHASE 8: BUSINESS ACTIVITY AUDITING

Identify important operations in the actual repository and integrate auditing at the relevant application/service boundaries.

Include:
- Project creation.
- Project deletion and restoration where applicable.
- Relevant project modifications.
- Ownership transfers.
- Project visibility modifications.
- Public and private link creation.
- Sharing-link revocation, expiration, and permission changes.
- Collaboration invitations.
- Invitation acceptance and rejection.
- Collaborator removal.
- Collaborator role and permission changes.
- Important project exports, imports, and asset operations where supported.
- Other existing high-risk business operations.

Record who performed an operation, what resource was targeted, what action occurred, when it occurred, from which trusted IP, and whether the operation succeeded.

Include a safe summary of relevant changes in structured metadata. For example, record previous and new permission levels for a collaborator, but never dump whole entities or sensitive project contents.

Important: do not blindly record a successful database operation before its transaction commits.

For operations requiring guaranteed audit persistence, use an appropriate transactional strategy, including a transactional outbox if the repository's architecture requires asynchronous delivery.

Avoid auditing expected no-op operations as successful modifications.

Audit denied and failed sensitive operations where appropriate.

PHASE 9: RELIABLE PERSISTENCE AND PERFORMANCE

Avoid synchronous database writes on every routine HTTP request.

Use a reliable persistence strategy appropriate to event criticality:
- Critical security and privileged-operation events require strong delivery guarantees.
- Selected noncritical events may use bounded asynchronous processing.
- Ordinary diagnostics should flow to the existing structured logging infrastructure.

If asynchronous queues are introduced, define bounded capacity, batching, backpressure, cancellation behavior, graceful shutdown, crash recovery, and failure handling.

An in-memory queue must never be treated as durable storage.

Do not silently discard critical security events.

Where business operations and audit events must commit together, use the same transaction when feasible. Otherwise use a durable outbox or another explicitly documented strategy.

Create controlled fallback diagnostics for audit subsystem failures without triggering recursive logging loops.

Provide suitable health and monitoring signals for audit persistence failures, queue saturation, dropped noncritical events, and delayed processing.

PHASE 10: ANOMALY DETECTION AND SECURITY ALERTS

Implement configurable, explainable security detection rules using recent audit history or suitable rolling counters.

Detect at least:
- Repeated failed logins from one IP.
- Multiple targeted accounts from one IP.
- Repeated failed logins against one account from different IPs.
- Failed login bursts followed by successful authentication.
- Confirmed or suspected refresh token reuse.
- Repeated 403 responses targeting protected resources.
- Excessive or suspicious 404 path enumeration.
- Excessive rate limit rejections.
- Sensitive administrative actions and major permission changes.

Design simple deterministic detection rules with configurable thresholds and time windows. Do not introduce AI-based detection or unnecessary external infrastructure.

Differentiate informational anomalies, warnings, and critical incidents.

Avoid repeatedly creating duplicate incidents for the same ongoing activity. Use incident grouping, time windows, and deduplication.

Provide a mechanism for assigning incidents a review status.

IP changes should be treated as contextual signals. Do not automatically classify every new IP address, VPN, or mobile network change as account compromise.

Ensure relevant incidents are visible in the administrative interface.

PHASE 11: ADMINISTRATIVE API AND FRONTEND

Inspect the existing administration architecture and extend it using current UI, API, routing, authorization, and component conventions.

Implement or integrate an administration interface that allows authorized administrators to:

1. View recent security events and activity audit history.
2. Filter events by date range, category, severity, event type, outcome, actor, target account, project, IP, and HTTP status.
3. Search and inspect event details.
4. Review successful and failed login history.
5. Inspect relevant activity for individual accounts and projects.
6. Review detected security anomalies and incidents.
7. See incident severity and review status.
8. View relevant recent statistics, such as failed logins, suspicious requests, token reuse, and blocked requests.
9. Navigate from incidents to their underlying audit records using correlation identifiers.

Use server-side pagination, sorting, filtering, and efficient database queries. Do not load the entire audit history into the browser.

Enforce authorization on the backend, not merely through hidden frontend navigation.

Introduce dedicated administrative permissions if the existing authorization model requires them.

Restrict sensitive audit data to appropriately authorized personnel. Consider separate permissions for viewing security events, viewing activity history, and managing incidents.

Do not expose unnecessary personal information in summaries.

Record access to sensitive audit records and important administrative audit actions without creating recursive or unbounded audit loops.

Where feasible, use the existing frontend UI components and design system rather than introducing another design language.

The frontend should provide useful loading states, empty states, error handling, and readable timestamps.

Use UTC for storage and clearly defined display timezone behavior.

PHASE 12: RETENTION, PRIVACY, AND INTEGRITY

Implement configurable retention settings for different audit categories.

Do not hardcode an arbitrary universal retention period. Provide reasonable documented defaults that can be adjusted according to actual legal requirements and operational needs.

Support efficient scheduled cleanup or archival.

Restrict database permissions for audit data. Ordinary users must not be able to modify or erase audit records.

Where appropriate, separate the application's audit-write capabilities from administrative audit-read capabilities.

Protect against audit injection, oversized metadata, excessive event volume, and untrusted input.

Never include raw secrets in persisted audit records or the administrative API.

Assess realistic audit integrity protections and document their guarantees and limitations. Ordinary database permissions are not sufficient protection against a fully compromised database administrator.

Do not add expensive tamper-evidence infrastructure without explaining why it is necessary.

PHASE 13: TESTING

Implement meaningful automated tests covering:

- Audit event creation and persistence.
- Database migrations and critical indexes.
- Successful login and failed login.
- Anonymous requests.
- Authorization failures.
- Refresh token rotation and concurrent refresh requests.
- Refresh token replay and session revocation.
- Correct client IP behind the configured reverse proxy.
- Spoofed forwarding headers.
- IPv4 and IPv6 handling.
- 400, 401, 403, 404, 405, 429, and relevant 5xx behavior.
- No duplicate audit events for one logical failure.
- Project creation and deletion auditing.
- Sharing and collaboration auditing.
- Proper transaction handling for critical events.
- Audit persistence failures and fallback behavior.
- Incident grouping and threshold boundaries.
- Administrative API permissions.
- Filtering, pagination, and data isolation.
- Sensitive-data redaction.
- No passwords, raw tokens, cookies, or credentials in database audit records.
- Compatibility with Docker and production proxy assumptions where testable.

Use the existing test framework and testing conventions.

Run the applicable builds, tests, and database migration checks. Resolve failures caused by the implementation.

PHASE 14: ACCEPTANCE CRITERIA

The implementation is complete when:

- Relevant successful and unsuccessful security actions produce structured audit events.
- Important user, project, sharing, and collaboration operations are audited.
- Important records are stored in PostgreSQL.
- Client IP attribution is correct and spoof-resistant in the supported proxy deployment.
- IPv4 is normalized where appropriate, and genuine IPv6 is supported.
- Successful login history can be investigated per account.
- Token reuse is properly detected and audited under the supported token architecture.
- Important HTTP failures are observable without excessive database noise.
- Authorized administrators can investigate activity through the frontend.
- Suspicious activity detection generates meaningful, reviewable incidents.
- Sensitive credentials and secrets never enter audit records.
- Critical event persistence has documented failure and recovery semantics.
- The implementation does not break authentication, project workflows, or existing API response contracts.
- Appropriate automated tests pass.

DELIVERY

Implement the changes directly in the repository.

Before editing, summarize the existing relevant architecture and the implementation strategy.

As you work, verify functionality rather than assuming success from compilation alone.

After implementation, provide:
- A concise summary of changes.
- The database schema and migrations introduced.
- Newly supported audit events.
- Administrative API and UI changes.
- Configuration and Docker/reverse proxy changes.
- Test results and commands executed.
- Any remaining limitations, security assumptions, or production deployment requirements.

Do not invent functionality that does not exist in the repository. If a requested feature is absent, explicitly identify the missing prerequisite and implement only what can be safely integrated without unnecessary architectural disruption.

Prioritize correctness, security, maintainability, and compatibility with the existing application over adding dependencies or building unnecessarily complex infrastructure.
