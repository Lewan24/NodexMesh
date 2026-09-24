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

### Project media library

Each project has a private library for PNG, JPEG, GIF, WebP, static SVG, MP4 and
WebM. The API stores metadata in PostgreSQL and file bytes outside the web root.
The new migration is applied on API startup.

For local development, `Library:Path` in `Backend/src/NodexMeshApi/appsettings.json`
defaults to `App_Data/library`, relative to the API content root. The directory is
created on first upload and excluded from Git. Absolute paths are also supported.
The API process must have read/write access to that directory.

Both Compose files mount `library-data` at `/app/storage`, owned by the container's
non-root `app` user. Configure these environment values in Compose or `.env`:

```dotenv
LIBRARY_PATH=/app/storage/library
LIBRARY_MAX_FILE_BYTES=52428800
LIBRARY_MAX_PROJECT_BYTES=1073741824
```

They map to `Library__Path`, `Library__MaxFileBytes`, and
`Library__MaxProjectBytes`. Keep the Docker path inside `/app/storage` for persistence;
if using a different mount, provision it with write permission for the `app` user.
The frontend nginx upload limit is 50 MiB; update `client_max_body_size` in
`Frontend/nginx.conf` and your external proxy when increasing the API limit.
Back up **both PostgreSQL and the library volume**. Multiple API replicas need a
shared filesystem at the configured path. PostgreSQL serializes project quota checks.

Members can view files; editors and owners can upload, rename and delete them.
Only owners can create, replace or revoke public links. Private content requires a
valid bearer token and a fresh project permission check on every request. The browser
fetches it through the authenticated API client and renders an object URL, without
putting credentials in HTML or URLs. Authorization is the boundary: CORS and custom
headers are not secrets and cannot prevent an authorized member from saving a file.

Public links contain a random 256-bit capability token stored in the database so owners can retrieve and copy the same link later. Tokens are returned only in owner-authorized responses.
Paste the link into an image or icon block's URL input to use it in another project.
Retrieving or copying a link never rotates it. Revoking access invalidates all public URLs for the file. Existing hash-only links remain valid; retrieving one creates a stable alias without breaking the original URL. Deletion and project trash
also deny future reads. Files already downloaded cannot be recalled. Public board
sharing does not publish private library assets: use explicit public media links for
assets intended for anonymous board visitors.

Uploads are streamed with file and project size limits, generated storage filenames,
and extension/signature validation. SVG accepts a restricted static element/attribute
set and rejects scripts, event handlers, external resources, styles and DTDs. This is
not a malware scanner or a video transcoder; browser codec support still applies.
Private video playback downloads a bounded file into a browser blob before playback;
public content supports HTTP range requests. Project JSON exports contain media
references, not copies of the files. Importing them does not transfer ownership or
bypass the original project's access checks.

Deleting a library entry removes its file. The hourly cleanup job removes orphaned
files older than one day, including files left after permanent project deletion or an
interrupted upload. Trashed projects retain their library for restoration.

Upload design reference: [ASP.NET Core file upload security guidance](https://learn.microsoft.com/aspnet/core/mvc/models/file-uploads).
