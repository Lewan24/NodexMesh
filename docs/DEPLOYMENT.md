# Deployment

## Development Compose stack

Copy the environment template, set real secrets, and start the stack:

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD, JWT_KEY, and ADMIN_PASSWORD.
docker compose build --no-cache
docker compose up -d
```

Services:

- frontend: <http://localhost:3000>
- API: <http://localhost:8080>
- Adminer: <http://localhost:8081>
- PostgreSQL: private Compose network unless its commented port mapping is enabled

`postgres-data` stores PostgreSQL, `library-data` stores uploaded media, and `data-protection-keys`
stores the encryption keys needed to decrypt SMTP credentials and queued email. Back up all three.
The API applies committed migrations at startup.

## Email delivery

Email is disabled by default. While it is disabled, new accounts are confirmed automatically,
password-reset email requests return a generic accepted response without sending anything, and
all notification email is skipped. This keeps local, demo, and mock deployments self-contained.

There are two mutually exclusive configuration paths:

- Set `EMAIL_HOST` and the other `EMAIL_*` values in `.env`/Compose (or the equivalent
  `Email__*` application settings). A non-empty host makes server configuration authoritative
  and the administration panel read-only.
- Leave `EMAIL_HOST` empty and configure SMTP in **Administration > Email**. The password is
  encrypted with ASP.NET Core Data Protection before database storage and is never returned by
  the API. Changes are effective immediately.

Production `EMAIL_PUBLIC_BASE_URL` must be the public HTTPS frontend origin. Preserve the
`data-protection-keys` volume across upgrades and restores; losing it makes stored SMTP secrets
and pending protected messages unreadable. Use an orchestrator secret store for environment-based
SMTP passwords. The database outbox retries transient delivery failures and exposes pending and
failed counts in the administration panel.

Default account, project, deletion, security-alert, and test-message templates are created in the
database during startup. Administrators can edit their subject, plain-text fallback, and HTML
content under **Administration > Email > Email templates**, preview the rendered branded message,
or restore an individual template to its application default. Template variables are escaped when
inserted into HTML, and active content such as scripts, forms, frames, event handlers, and
executable URLs is rejected. Messages are sent as UTF-8 `multipart/alternative`, with both a plain
text fallback and an HTML card.

## Production Docker Hub/Portainer stack

`docker-compose.production.yml` is a standalone stack using `lewan24/nodexmesh-api:latest`, `lewan24/nodexmesh-web:latest`, and PostgreSQL 17. Before deployment:

1. Replace both database password placeholders with the same strong random value.
2. Replace `Jwt__Key` with a separate random value of at least 32 characters.
3. Set `Cors__AllowedOrigins__0` to the public HTTPS origin without a trailing slash.
4. Set `Admin__Email` and provide `Admin__Password` securely before first startup. A missing password prevents creation of a new administrator.
5. Confirm the fixed `172.30.0.0/24` network does not overlap the host/network environment.

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml logs api
```

The frontend image is compiled with `VITE_DATA_SOURCE=http` and `VITE_API_BASE_URL=/api/v1`; those are build-time settings. The frontend Nginx container proxies `/api/` and `/hubs/` to the private API.

## TLS and trusted proxy

Terminate TLS at an external reverse proxy and forward to host port 3000 with WebSocket support. Production refresh cookies require HTTPS. Restrict port 3000 so only the trusted edge can reach it.

The production stack assigns frontend `172.30.0.10`, API `172.30.0.11`, and database `172.30.0.12`. The API trusts only the frontend address with a forwarding limit of one. If the topology changes, configure exact immediate proxy addresses or a dedicated trusted proxy CIDR:

```text
ReverseProxy__KnownProxies__0=<immediate-proxy-IP>
ReverseProxy__KnownNetworks__0=<dedicated-proxy-CIDR>
ReverseProxy__ForwardLimit=<validated-hop-count>
```

Do not use a catch-all network or `ASPNETCORE_FORWARDEDHEADERS_ENABLED`. The edge must discard client-supplied forwarding headers. Verify the recorded audit IP with real and forged `X-Forwarded-For` requests after deployment.

## Secrets

The default stack reads credentials from `.env`. `docker-compose.secrets.yml` can instead mount PostgreSQL and JWT values from `secrets/postgres_password.txt` and `secrets/jwt_key.txt`. Keep `.env` and `secrets/` out of source control. For production, prefer the orchestrator's secret store and separate migration/runtime database roles.

## Media library

Defaults:

```dotenv
LIBRARY_PATH=/app/storage/library
LIBRARY_MAX_FILE_BYTES=52428800
LIBRARY_MAX_PROJECT_BYTES=1073741824
```

The API validates file signatures/extensions and stores bytes outside the web root. The frontend Nginx upload limit is 50 MiB; update it and the external proxy together if raising the API limit. Multiple API replicas require shared file storage.

Back up PostgreSQL, `library-data`, and `data-protection-keys`. Project JSON exports do not contain
file bytes. The hourly cleanup removes orphaned files older than one day; trashed projects retain
their library until permanent deletion.

## Production checklist

- Pin/version application and base images instead of relying indefinitely on `latest`.
- Configure automated PostgreSQL and media-volume backups and test restoration.
- Configure centralized container/audit log collection, retention, disk alerts, and time synchronization.
- Run migrations once before rollout when deploying multiple API replicas.
- Add a SignalR backplane and distributed presence store before scaling the API horizontally.
- Add edge request limits/WAF controls appropriate to the exposure.
- Monitor `/health`, audit persistence failures/checkpoint lag, storage quotas, 429s, and database capacity.
