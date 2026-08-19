# Deploying UMBRA

The web app and the API are ordinary HTTP services — put them wherever you
like, behind whatever proxy you like. **Headscale is not.** Almost every
deployment mistake in this project comes from treating it like a normal web
service, so start here.

## The one rule

Headscale serves three things on a single listener: the control plane (TS2021),
the embedded DERP relay, and — in TLS mode — the ACME challenge. A reverse
proxy can carry the first one. It cannot carry DERP: that channel is a
long-lived, non-WebSocket HTTP upgrade, and its companion STUN service is UDP.

Put Caddy, nginx or a Cloudflare Tunnel in front of Headscale without providing
another relay, and everything looks fine — nodes appear online, the dashboard
works — right up until a client behind CGNAT (mobile data, most home ISPs)
tries to connect and gets **"Relay server unavailable"**.

So: either nothing sits in front of Headscale, or something else provides the
relay. `deploy.sh` refuses any other combination.

## Topology 1 — native TLS (recommended, and the one that is validated)

Headscale terminates TLS on 443 itself and relays through its embedded DERP.
This is the setup proven end-to-end on 2026-08-03: a Raspberry Pi exit node at
home, and a phone on 5G behind carrier NAT reaching the internet through it.

It needs a domain and a router you control, but no VPS.

```bash
# apps/api/.env  (or the repo-root .env consumed by deploy.sh)
HEADSCALE_TLS_HOSTNAME=hs.example.com
HEADSCALE_EXTERNAL_URL=https://hs.example.com
API_PUBLIC_URL=http://<host-or-domain>:3333/api/v1
```

```bash
./deploy.sh          # adds docker-compose.tls.yml automatically
```

Checklist — all four matter:

| | |
|---|---|
| **DNS** | `hs.example.com` → an A record pointing at your public IP, resolved **directly**. On Cloudflare this means **DNS-only (grey cloud)**. The orange cloud proxies 443 and breaks DERP *and* the ACME challenge. |
| **Router** | forward **443/tcp** (control plane + DERP) and **3478/udp** (STUN). Port 80 is not needed — the ACME challenge is TLS-ALPN-01, on 443. |
| **API → Headscale** | handled for you: `docker-compose.tls.yml` gives the Headscale container a network alias equal to `HEADSCALE_TLS_HOSTNAME`, so the API reaches it by its public name over the compose network. No NAT hairpinning required. |
| **Certificate** | issued lazily, on the first TLS handshake. `curl -sSI https://hs.example.com/health` triggers and verifies it. |

A Cloudflare Tunnel can still carry the web app and the API in this mode — just
never add a tunnel route for the Headscale hostname.

## Topology 2 — proxy + standalone derper

Only worth it when you already run a public VPS. Headscale goes behind Caddy or
a tunnel, and a separate `derper` provides the relay.

```bash
DERP_HOSTNAME=derp.example.com
DERP_RUN_LOCAL=1              # only if THIS host has the public IP
CLOUDFLARE_TUNNEL_TOKEN=...   # optional, for web + API
```

`deploy.sh` then generates `headscale/derp.yaml` pointing at that relay and sets
`HEADSCALE_DERP_SERVER_ENABLED=false`. The derper host needs 80+443/tcp and
3478/udp open, and its DNS record must also resolve directly (not proxied).

Note: `derper` runs without `-verify-clients`, so it is an open relay. Fine
behind a firewall, worth restricting before any public announcement.

## Topology 3 — LAN / development

The default. `docker compose up -d` gives you Headscale on plain HTTP :8080 with
its embedded DERP. Everything works between machines on the same network;
nothing works from behind CGNAT. `deploy.sh` warns and continues.

```bash
docker compose up -d              # headscale + postgres only
pnpm --filter api dev             # API on :3333
pnpm web                          # web on :3000
```

## Environment reference

| Variable | Purpose |
|---|---|
| `HEADSCALE_TLS_HOSTNAME` | Enables topology 1. Must match `HEADSCALE_EXTERNAL_URL`. |
| `HEADSCALE_EXTERNAL_URL` | The URL agents join the mesh at. Baked into every install command. |
| `HEADSCALE_API_KEY` | Generated with `headscale apikeys create`. The API needs it for users, pre-auth keys, routes and policy. |
| `API_PUBLIC_URL` | The URL nodes call back on. If it says `localhost`, every generated install command is broken. |
| `DERP_HOSTNAME` / `DERP_RUN_LOCAL` | Enables topology 2. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Tunnel for web + API. Never for Headscale. |
| `DB_PASSWORD` | Set it **before** the first deploy — postgres bakes it in at volume init. |
| `APP_KEY` | Required. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

## Verifying a deployment

```bash
curl -sSI https://hs.example.com/health          # 200 + a valid certificate
curl -s   http://<api-host>:3333/api/v1/health   # {"status":"ok"}
docker compose logs -f headscale                 # no TLS/ACME errors
```

Then enroll a node and confirm it relays, which is the only test that actually
proves the data plane:

1. Generate an enroll token from the dashboard, run the `curl … | bash` command
   on a fresh machine.
2. From a client on **mobile data** (not the same LAN), join with the command
   from the Connect modal.
3. `curl ifconfig.me` on the client should return the **exit node's** public IP.