# ssl

TLS certificates for the optional self-hosted VPS deployment path
(`nginx` service in `docker-compose.yml`).

Required files (mounted from `nginx.conf`):
- `dalli.rs.crt` — TLS certificate
- `dalli.rs.key` — matching private key

**The primary deployment target is Netlify** (edge TLS + HSTS). TLS
termination for the API on the VPS path terminates at nginx using these
certificates; nginx fails closed (will not start) until valid certs are
present, which is the intended behavior for a TLS-only configuration.

Generate with certbot:
```bash
docker run --rm -v "$PWD/ssl:/etc/nginx/ssl" certbot/certbot certonly \
  --webroot -w /tmp -d api.dalli.rs
```
If TLS is handled elsewhere, remove the `ssl/` mount and the `443` listener
from `nginx.conf` and expose plain HTTP on port 80 only.

Never commit production private keys. Keep this directory on the server
only (add `ssl/*.key` to `.gitignore`).