# Nginx Proxy Manager, real client IPs and IP protection

The supported chain is **browser → Nginx Proxy Manager (TLS) → frontend Nginx (HTTP) → API (HTTP)**. There are two trust boundaries: frontend trusts the immediate NPM peer; API trusts the immediate frontend peer. The frontend resolves the client IP and replaces `X-Forwarded-For` with **one verified address**, so the API’s `ForwardLimit` is **1**, despite there being two physical proxies. Setting it to 2 is unnecessary with this configuration.

## Changes that prevent refresh-related bans

The old global quota was 300 requests/minute, refresh was 30/minute, and every page/asset Nginx gate subrequest consumed the same anonymous quota as API requests. Repeated 429 responses could also trigger a persistent ban. If frontend edge trust was missing, all browsers could share NPM’s address and counters. These are code/configuration paths capable of causing false positives; the actual reason for a particular existing ban is its `reason` and audit events.

The new defaults are:

| Request quota | Per-minute limit | Partition |
| --- | ---: | --- |
| Anonymous API browsing | 2,000 | Verified client IP |
| Authenticated API browsing | 1,000 | User ID |
| Session refresh | 120 | Verified client IP |
| Nginx ban-check gate | 10,000 | Verified client IP, separate from browsing |
| Login, registration, MFA and sensitive administration | 5 | Verified client IP, shared strict bucket |

Board read/write, sharing and upload policies retain their separate quotas. A 429 is a temporary throttle with `Retry-After`, not an automatic persistent ban by default. The gate has its own quota and consumes none of the browsing quota. Its quota exhaustion returns 429 to a direct API caller and Nginx treats that as a failed subrequest (500); normal page refreshes are far below this gate quota. Friendly client IPs bypass global browsing and gate quotas, but **authentication and other named policy limits still apply**.

Expected 401 responses from `/api/v1/auth/refresh` and `/api/v1/auth/profile`, matched API resource 404s, and unmatched `/assets/*`, `/favicon.ico`, `/robots.txt` and `/manifest.webmanifest` requests remain audited without contributing to automatic ban counters. Failed login/MFA proofs continue to count.

## Recommended exact Docker setup

Use a dedicated Docker network between NPM and frontend, avoiding ambiguity from forwarding to a host-published port. The following addresses are examples you can use directly if these subnets do not overlap your existing networks:

| Component / network | Address |
| --- | --- |
| NPM on external edge network | `172.29.0.2` |
| Frontend on external edge network | `172.29.0.3` |
| Frontend on production app network | `172.30.0.10` |
| API on production app network | `172.30.0.11` |
| Frontend on local-build app network | `172.31.0.10` |

1. Create the network once:

   ```bash
   docker network create --driver bridge --subnet 172.29.0.0/24 nodexmesh_edge
   ```

2. In **your NPM Compose file**, attach the NPM service to this network while preserving its existing networks. Replace `npm` with your actual service name:

   ```yaml
   services:
     npm:
       networks:
         default: {}
         nodexmesh_edge:
           ipv4_address: 172.29.0.2
   networks:
     nodexmesh_edge:
       external: true
       name: nodexmesh_edge
   ```

   Recreate NPM using its existing Compose deployment. Do not attach NPM to the API/database app network.

3. Deploy **updated API and frontend images** containing this change. The production file uses registry images; `up -d` alone does not rebuild them. Run NodexMesh with the supplied override once those images are available:

   ```bash
   docker compose -f docker-compose.production.yml -f docker-compose.npm.example.yml up -d
   ```

   For locally built images use:

   ```bash
   docker compose -f docker-compose.yml -f docker-compose.npm.example.yml up -d --build
   ```

   The override sets frontend `TRUSTED_EDGE_CIDR=172.29.0.2/32` and the `nodexmesh-frontend` DNS alias. API stays on its private app network. Production API settings stay:

   ```yaml
   ReverseProxy__KnownProxies__0: 172.30.0.10
   ReverseProxy__ForwardLimit: 1
   ```

   Local-build API uses `172.31.0.10` instead. Leave `ReverseProxy__KnownNetworks` empty. If changing networks, adjust fixed addresses and trust together.

4. In NPM, create/edit the Proxy Host:

   - Domain Names: your public NodexMesh domain.
   - Scheme: **http**.
   - Forward Hostname/IP: **nodexmesh-frontend**.
   - Forward Port: **8080** (container port, not host port 3000).
   - Websockets Support: **enabled**.
   - Cache Assets: **disabled** (cached content must not bypass the app’s ban gate).
   - SSL: select/request the certificate and enable **Force SSL**. If your NPM version exposes forwarded-proto trust, leave it disabled for this direct-browser topology.
   - API `Cors__AllowedOrigins__0`: exactly `https://your-domain`, no trailing slash.
   - API `ASPNETCORE_ENVIRONMENT`: **Production**.

5. For the stated topology where NPM receives browser traffic directly (no CDN/load balancer before NPM), use this **NPM Proxy Host → Advanced** configuration:

   ```nginx
   # Override inherited broad private-network real-IP trust for this host.
   set_real_ip_from 127.0.0.1;
   real_ip_header X-Real-IP;
   real_ip_recursive off;

   # The TLS connection to NPM determines the original scheme.
   set $x_forwarded_proto $scheme;
   set $x_forwarded_scheme $scheme;
   ```

   NPM’s current template already supplies `Host`, `X-Real-IP`, `X-Forwarded-For` and forwarded scheme headers inside its proxy location. Do not paste duplicate `location /` blocks or competing server-level `proxy_set_header` directives. Its default `X-Forwarded-For` is `$proxy_add_x_forwarded_for`; frontend trusts only NPM, takes the rightmost untrusted address (the actual browser peer), and discards spoofed left-hand entries before forwarding to API. Narrowing NPM’s real-IP trust is particularly relevant to LAN/Docker-originated browser requests. The `set` directives override NPM’s scheme maps, which otherwise may accept incoming forwarding headers.

   Check the generated configuration on your installed NPM version:

   ```bash
   docker exec <npm-container> nginx -t
   docker exec <npm-container> nginx -T
   ```

   If NPM sits behind another proxy/CDN, do not use this direct-edge snippet unchanged: configure only that upstream’s exact trusted addresses and sanitized headers at NPM first.

6. Restrict external access to frontend host port 3000; only NPM should provide public access. Keep production API/database unpublished. Local Compose publishes API port 8080 for development; remove that mapping for production use. The external network override retains existing host port mappings, so firewall/remove them according to your deployment.

NPM’s actual header/template behavior was checked against its [proxy include](https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/docker/rootfs/etc/nginx/conf.d/include/proxy.conf), [host template](https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/backend/templates/proxy_host.conf) and [global real-IP/scheme configuration](https://github.com/NginxProxyManager/nginx-proxy-manager/blob/develop/docker/rootfs/etc/nginx/nginx.conf). Trusted address resolution follows [Nginx real-IP rules](https://nginx.org/en/docs/http/ngx_http_realip_module.html); API forwarding follows [ASP.NET Core trusted proxy rules](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0).

## If you continue forwarding NPM to host port 3000

Use NPM `http://<docker-host-IP>:3000`. Set frontend `TRUSTED_EDGE_CIDR` to the **immediate source address actually seen inside frontend**, which may differ from the NPM container address because of Docker NAT. Frontend logs now show:

```text
client=203.0.113.25 peer=172.29.0.2 scheme=https method=GET status=200
```

`peer` is the socket peer before real-IP processing. `client` is the verified browser IP after it. If both show a private proxy address, frontend trust is missing/wrong. Inspect logs first, then trust that precise peer `/32` or `/128`; avoid trusting an entire Docker/private network. API still trusts only frontend and uses `ForwardLimit=1`. Do not add NPM to API `KnownProxies` to compensate for incorrect frontend trust.

```bash
docker compose -f docker-compose.production.yml logs --tail 100 frontend
```

If a shared/NAT gateway is the immediate peer, host/network restrictions must ensure only NPM can use that forwarding path. The dedicated edge network avoids this uncertainty.

## Verify the real IP before enabling aggressive bans

From your browser, load the app and inspect frontend logs. The frontend `client` must be your actual public client IP (or LAN IP for a LAN client), `peer` must be NPM, and `scheme` must be `https`. In **Administration → Audit**, include Information events and inspect an event’s `clientIp`; it must match frontend `client`. The Security tab lists failure records only, so a clean successful client may have no row there.

From the same client, test spoofed headers:

```bash
curl -I https://your-domain/
curl -I https://your-domain/ -H 'X-Forwarded-For: 192.0.2.99' -H 'X-Real-IP: 192.0.2.99'
```

Both requests must log the real client, not `192.0.2.99`. Do not switch `TRUSTED_EDGE_CIDR` or API trust to `0.0.0.0/0` or `::/0`, or enable blanket `ASPNETCORE_FORWARDEDHEADERS_ENABLED`.

## Friendly IPs and existing bans

The existing allowlist is now explicitly wired into both main Compose files. In the NodexMesh `.env` (or Portainer stack environment) set:

```dotenv
FRIENDLY_IP_1=203.0.113.25
FRIENDLY_IP_2=2001:db8::25
```

Replace these documentation addresses with your actual trusted **client** addresses. Empty values are ignored. Exact IPv4/IPv6 addresses only; this is not a CIDR allowlist. For more entries, add API environment `IpProtection__Allowlist__2`, `__3`, etc. to Compose/Portainer. Setting arbitrary variables in `.env` alone does not pass them into containers unless mapped in Compose.

Recreate the API for settings to apply:

```bash
docker compose -f docker-compose.production.yml -f docker-compose.npm.example.yml up -d --force-recreate api
```

Friendly clients bypass automatic **and existing/manual** bans, the global browsing quota and gate quota; passwords, MFA, authorization, account lockout and sensitive endpoint quotas still apply. The stored ban is not deleted by allowlisting, so release it in **Administration → Security** if you want it cleared permanently. Removing an allowlist entry can reactivate an unexpired stored ban. Never allowlist NPM/frontend merely to fix client-IP detection: when client-IP resolution is broken, that would exempt everyone.

To recover from your existing lockout, first correct proxy trust, then set your own friendly client IP and recreate API, sign in and release the ban (including a wrongly banned shared proxy address, if present). If the old wrong peer was banned and correcting forwarding no longer presents that peer, you can sign in normally and release its stale record. Raising thresholds does not remove bans already stored in PostgreSQL.

## How custom fail2ban works

This is application-level enforcement, not the OS fail2ban daemon or a TCP firewall. An independent audit writer commits failure events and immediately updates a persistent IP record. Separate counters are maintained in a ten-minute fixed window:

| Rule | Default automatic-ban threshold |
| --- | ---: |
| Failed password/MFA verification or locked-out login | 10 |
| Other unauthorized/forbidden responses | 100 |
| Unmatched routes, excluding normal browser assets | 100 |
| Rate-limit responses | Disabled; counter remains visible |

Any enabled threshold triggers a **60-minute** ban. Successful requests do not erase evidence; expiry or administrator release resets counters. A ban denies API access with 403, prevents Nginx from serving pages/assets, and closes live collaboration sockets (immediately on the local API, within five seconds on other replicas). State survives restarts in PostgreSQL; UUID concurrency checks prevent lost updates. Manual bans use a chosen duration and an audit reason. Audit incident alerts run separately and do not determine ban thresholds.

Configure the supplied Compose files with:

```dotenv
IP_PROTECTION_ENABLED=true
IP_PROTECTION_WINDOW_MINUTES=10
IP_PROTECTION_BAN_MINUTES=60
IP_FAILED_LOGIN_THRESHOLD=10
IP_UNAUTHORIZED_THRESHOLD=100
IP_NOT_FOUND_THRESHOLD=100
IP_BAN_ON_RATE_LIMIT=false
IP_RATE_LIMIT_THRESHOLD=100
RATE_LIMIT_IP_PER_MINUTE=2000
RATE_LIMIT_USER_PER_MINUTE=1000
RATE_LIMIT_AUTH_PER_MINUTE=5
RATE_LIMIT_REFRESH_PER_MINUTE=120
RATE_LIMIT_GATE_PER_MINUTE=10000
```

These map to API `IpProtection__*` and `RateLimiting__*` variables; see `.env.example` and the Compose environment sections. `IP_RATE_LIMIT_THRESHOLD` only triggers bans if `IP_BAN_ON_RATE_LIMIT=true`; keep it false for ordinary browser use. Rate quotas are in-memory per API replica; ban records are shared/persistent. Proxy trust, friendly clients and ban rules are different settings and must not be substituted for each other.
