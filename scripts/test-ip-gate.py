"""Exercise the shipped Nginx gate using an isolated Docker container and mock API.

Run: python3 scripts/test-ip-gate.py (requires Docker; downloads the runtime image).
Does not touch application containers or databases. Uses ephemeral localhost ports.
"""
import http.client
import http.server
import pathlib
import socket
import subprocess
import tempfile
import threading
import time
import uuid

ROOT = pathlib.Path(__file__).resolve().parents[1]
IMAGE = "nginxinc/nginx-unprivileged:1.27-alpine"
seen = []


class Api(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        ip = self.headers.get("X-Forwarded-For")
        seen.append((self.path, ip, self.headers.get("X-Forwarded-Proto")))
        if self.path == "/api/v1/security/ip-check":
            status = 403 if ip == "192.0.2.99" else 500 if ip == "192.0.2.98" else 204
        else:
            status = 200
        self.send_response(status)
        self.end_headers()
        if status == 200:
            self.wfile.write(b"API response")

    def log_message(self, *_):
        pass


def request(port, path, ip, source=None, real_ip=None):
    conn = http.client.HTTPConnection("127.0.0.1", port, timeout=3,
                                      source_address=(source, 0) if source else None)
    headers = {"X-Forwarded-For": ip, "X-Forwarded-Proto": "https"}
    if real_ip:
        headers["X-Real-IP"] = real_ip
    conn.request("GET", path, headers=headers)
    response = conn.getresponse()
    result = response.status
    response.read()
    conn.close()
    return result


api = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Api)
threading.Thread(target=api.serve_forever, daemon=True).start()
try:
    for trusted_edge in ["127.0.0.1/32", "192.0.2.10/32"]:
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        with tempfile.TemporaryDirectory(prefix="nodex-ip-gate-") as tmp:
            directory = pathlib.Path(tmp)
            directory.chmod(0o755)
            (directory / "index.html").write_text("SPA page")
            (directory / "asset.js").write_text("static asset")
            config = (ROOT / "Frontend/nginx.conf").read_text()
            config = config.replace("listen 8080;", f"listen {port};").replace("api:8080", f"127.0.0.1:{api.server_port}")
            with socket.socket() as sock:
                sock.bind(("127.0.0.1", 0))
                npm_port = sock.getsockname()[1]
            # Mirror NPM's inherited private-peer trust and generated forwarding maps,
            # then apply the documented per-host direct-edge overrides.
            config += f"""
set_real_ip_from 127.0.0.0/8;
real_ip_header X-Real-IP;
map $http_x_forwarded_proto $x_forwarded_proto {{ default $scheme; http http; https https; }}
map $http_x_forwarded_scheme $x_forwarded_scheme {{ default $scheme; http http; https https; }}
server {{
  listen {npm_port};
  set_real_ip_from 127.0.0.1;
  real_ip_header X-Real-IP;
  real_ip_recursive off;
  set $x_forwarded_proto $scheme;
  set $x_forwarded_scheme $scheme;
  location / {{
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-Proto $x_forwarded_proto;
    proxy_pass http://127.0.0.1:{port};
  }}
}}
"""
            (directory / "default.conf").write_text(config)
            name = "nodex-ip-gate-test-" + uuid.uuid4().hex[:12]
            subprocess.run(["docker", "run", "--rm", "-d", "--name", name, "--network", "host",
                            "-e", f"TRUSTED_EDGE_CIDR={trusted_edge}",
                            "-v", f"{directory}/default.conf:/etc/nginx/templates/default.conf.template:ro",
                            "-v", f"{directory}:/usr/share/nginx/html:ro", IMAGE], check=True, stdout=subprocess.DEVNULL)
            try:
                for attempt in range(100):
                    try:
                        if request(port, "/", "192.0.2.1") == 200:
                            break
                    except (OSError, http.client.HTTPException):
                        time.sleep(0.1)
                else:
                    subprocess.run(["docker", "logs", name], check=False)
                    raise AssertionError("Nginx did not become ready")
                paths = ["/", "/asset.js", "/shared/example", "/api/v1/auth/login", "/hubs/collaboration", "/probe-does-not-exist"]
                for path in paths:
                    if trusted_edge == "127.0.0.1/32":
                        assert request(port, path, "192.0.2.99") == 403, path
                        assert request(port, path, "192.0.2.98") == 500, path
                        assert request(port, path, "192.0.2.1") == 200, path
                    else:
                        # The direct caller is not a trusted proxy: ignore spoofed headers.
                        assert request(port, path, "192.0.2.99") == 200, path
                        assert seen[-1][1] == "127.0.0.1", seen[-1]
                if trusted_edge == "127.0.0.1/32":
                    for path in paths:
                        assert request(port, path, "192.0.2.99, 192.0.2.1") == 200, path
                        assert seen[-1][1] == "192.0.2.1", seen[-1]
                        # An untrusted LAN-like browser cannot spoof X-Real-IP at NPM.
                        assert request(npm_port, path, "192.0.2.99", source="127.0.0.2", real_ip="192.0.2.99") == 200, path
                        assert seen[-1][1:] == ("127.0.0.2", "http"), seen[-1]
                    print("PASS: NPM → frontend → API forwarding, forged X-Real-IP/XFF and scheme sanitization")
                print(f"PASS: gate, fail-closed lookup, pages/assets/API/hubs and header trust ({trusted_edge})")
            finally:
                subprocess.run(["docker", "stop", "-t", "1", name], check=True, stdout=subprocess.DEVNULL)
finally:
    api.shutdown()
    api.server_close()
