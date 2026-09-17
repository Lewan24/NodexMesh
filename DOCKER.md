# Docker deployment

The root Compose file runs the frontend, .NET API, PostgreSQL and Adminer:

```bash
cp .env.example .env  # optional; defaults are suitable only for local development
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

## Environment-variable credentials

Create `.env` in the repository root (it is ignored by Git) and set at least:

```dotenv
POSTGRES_DB=nodexmesh
POSTGRES_USER=nodexmesh_app
POSTGRES_PASSWORD=replace-with-a-long-password
JWT_KEY=replace-with-at-least-32-random-characters
```

This is convenient for local development. The values are passed as container
environment variables, so do not use this method for shared production hosts.

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
