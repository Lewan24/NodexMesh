# Docker deployment

The root Compose file runs the frontend, .NET API, PostgreSQL and Adminer:

```bash
cp .env.example .env
# Set POSTGRES_PASSWORD and JWT_KEY in .env before starting.
docker compose build --no-cache
docker compose up -d
```

Open the application at <http://localhost:3000>, the API at <http://localhost:8080>,
and Adminer at <http://localhost:8081>. In Adminer use `db` as the server, the
configured PostgreSQL user/password, and the configured database name. Data is kept
in the `postgres-data` volume.

The default Compose environment is `Development` so the local HTTP frontend can
call the API without an HTTPS redirect. Set `ASPNETCORE_ENVIRONMENT=Production`
when a TLS reverse proxy sits in front of the stack.

## Production with Docker Hub images

Use [docker-compose.production.yml](docker-compose.production.yml) as a standalone
file, or paste its contents into the Portainer stack editor on a Docker Standalone
endpoint. It pulls `lewan24/nodexmesh-api:latest`, `lewan24/nodexmesh-web:latest`
and PostgreSQL. No build context, `.env`, bind-mounted files or secrets files are
needed. The application images must be published before deploying.

Before deploying, edit the values directly in the YAML:

- Replace `CHANGE-ME-database-password` in both database and API settings with the
  same random password. A hex value from `openssl rand -hex 32` avoids connection
  string delimiters and Compose dollar-sign interpolation.
- Replace `Jwt__Key` with a separate random value from `openssl rand -hex 32`.
- Set `Cors__AllowedOrigins__0` to your public HTTPS origin, without a trailing slash.
- Set `Admin__Email`. Leave `Admin__Password` empty to generate a password in the
  API startup logs, or supply one with at least 12 characters including uppercase,
  lowercase, a digit and a symbol. This bootstraps the account only on first creation.

Point an HTTPS reverse proxy at the Docker host on port `3000`, with WebSocket
support enabled. The frontend proxies `/api/` and `/hubs/` to the private API.
TLS terminates at your external proxy; production refresh cookies require browser
access over HTTPS. Port `3000` itself serves HTTP. Database and API ports are not
published, and Adminer is not included.

In Portainer, deploy the edited stack. From the command line:

```bash
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d
docker compose -f docker-compose.production.yml logs api
```

The web image must be built with the Dockerfile defaults `VITE_DATA_SOURCE=http`
and `VITE_API_BASE_URL=/api/v1`; these are compiled into the frontend, not runtime
environment settings. The API applies migrations automatically on startup.
PostgreSQL data persists in the stack's `postgres-data` volume. Changing the YAML
database password after initialization does not change the existing database role's
password; update that role as well. Keep the stack name stable to reuse its volume.

Inline credentials are stored in the stack configuration: keep your edited copy
private. To update images, pull and recreate the stack using the same commands above
(or use Portainer's pull/redeploy option).

## Environment-variable credentials

Create `.env` in the repository root (it is ignored by Git) and set at least:

```dotenv
POSTGRES_DB=nodexmesh
POSTGRES_USER=nodexmesh_app
POSTGRES_PASSWORD=replace-with-a-long-password
JWT_KEY=replace-with-at-least-32-random-characters
```

This is convenient for local development. Like the inline production configuration,
the values are passed as container environment variables and visible to Docker administrators.
Leaving either value empty intentionally makes the API or database refuse to start.

## Docker secrets

Docker Compose can mount credentials as files instead of exposing them as ordinary
environment variables. Create the files with restrictive permissions:

```bash
mkdir -p secrets
openssl rand -base64 24 > secrets/postgres_password.txt
openssl rand -base64 48 > secrets/jwt_key.txt
chmod 600 secrets/*.txt
```

Start the stack with the secrets override. The backend entrypoint reads both files
from `/run/secrets` and builds the connection string before starting the API:

```bash
docker compose -f docker-compose.yml -f docker-compose.secrets.yml build --no-cache
docker compose -f docker-compose.yml -f docker-compose.secrets.yml up -d
```

Keep `secrets/` out of source control and rotate the files by recreating the
containers. In a production deployment, use your orchestrator's native secret
store rather than committing secret files or `.env` to the repository.
