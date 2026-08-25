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

## What the server runs on

The published images are built for **amd64 and arm64**, so the control plane can
live on whatever machine you already own — a Raspberry Pi 4/5, a mini PC, a VPS.
Every base image the stack depends on (TimescaleDB, Headscale, node, caddy)
publishes both architectures.

Budget roughly 2 GB of RAM for the whole stack. On a Pi, put the database on the
SD card only if you enjoy replacing SD cards; an external SSD is worth it.

### Moving an existing install

Two volumes carry the state, and losing either is not a small inconvenience:
`headscale-data` holds your nodes, their keys and the Let's Encrypt certificate —
without it every enrolled machine has to be re-enrolled — and `umbra-pgdata`
holds the accounts, organisations and history.

```bash
# on the old host, with postgres running
./scripts/migrate-volumes.sh export ./umbra-backup

# copy the folder over, then on the new host, before the first deploy
./scripts/migrate-volumes.sh import ./umbra-backup
```

The database travels as an SQL dump, not as a volume. `postgresql.conf` lives
inside the data directory, and the TimescaleDB image sizes it from the host's RAM
the first time it starts — so a directory copied from a 32 GB machine asks a
Raspberry Pi for 8 GB of shared memory and dies with `could not map anonymous
shared memory`, which the stack reports as `container umbra-postgres is
unhealthy`. Restoring a dump lets the destination write a configuration for
itself. (Data directories are also officially not portable across architectures
or major versions.)

Headscale's volume is SQLite, whose format is portable by design, so that one is
copied as-is.

Then point the router's forwards at the new machine: 443/tcp and 3478/udp for
Headscale, and whatever port `API_PUBLIC_URL` names for the API, since that is
the address baked into every install command.

## Putting the API and the dashboard behind TLS

Headscale holds 443 and cannot give it up — it serves the control plane, the
DERP relay and the ACME challenge on that one port, and none of them survives a
proxy. So a second TLS terminator cannot take 443 on the same address, and
forwarding 3333 and 3000 straight to the internet means **session tokens travel
in cleartext**. They are valid for 30 days; one captured request is enough.

A Cloudflare Tunnel solves it for these two without touching Headscale:

1. Zero Trust → Networks → Tunnels → create one, copy the token.
2. Add two public hostnames on that tunnel, both pointing at `http://caddy:80`.
   **Keep them one level deep**: `umbra.example.com` and `umbra-api.example.com`,
   not `api.umbra.example.com`. Cloudflare's free Universal SSL covers the apex
   and `*.example.com` only — a second-level name like `api.umbra.example.com`
   is not in the certificate, and every request fails with a TLS handshake
   error that looks like a server problem and is not one. Covering it needs
   Advanced Certificate Manager, which is paid.
3. In `.env`:

   ```
   CLOUDFLARE_TUNNEL_TOKEN=…
   WEB_PUBLIC_URL=https://umbra.example.com
   API_PUBLIC_URL=https://api.umbra.example.com/api/v1
   ```

4. `./deploy.sh` — it generates the cloudflared config and starts the tunnel
   profile.
5. **Remove the 3333 and 3000 forwards from the router.** The tunnel reaches the
   containers from inside; those ports no longer need to be public, and leaving
   them open defeats the point. 443/tcp and 3478/udp stay, for Headscale.

`API_PUBLIC_URL` is baked into every install command and into the URL agents
download their binary from, so changing it means new enrollments use the new
address. Existing agents keep the address they were enrolled with until they are
re-enrolled.

deploy.sh warns when either URL is plain HTTP on a non-local address.

## Agent binaries

`install.sh` downloads the agent from your own server (`GET /releases/<file>`),
so that endpoint must actually serve something — an API with an empty
`apps/api/resources/releases/` directory hands every new node a 404.

- **Using the published image** (`ghcr.io/alecinfo/umbra-api`): nothing to do.
  CI builds and signs the binaries into the image.
- **Building the image yourself**: run `./agent/build-releases.sh` first. It
  drops signed binaries and `manifest.json` into `apps/api/resources/releases/`,
  which the Dockerfile copies in.
- **Running the API from source** (`pnpm --filter api dev`): same script. The
  artifacts are gitignored, so a fresh clone has none.

See [agent/README.md](agent/README.md) for the signing key, and why losing it
strands every deployed agent.

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
| `SMTP_HOST` and friends | Optional. Without them nothing is mailed and invitation tokens and temporary passwords are returned to the caller instead — a self-hosted instance with no mail server stays usable. |
| `WEB_PUBLIC_URL` | Where the links in those emails point. |
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