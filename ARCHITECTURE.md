# How UMBRA works

Written against the code, not the design documents. The `.tex` specs in `docs/`
predate the move to Tailscale and describe an architecture that no longer
exists — see the end of this file.

## The short version

UMBRA does not implement WireGuard. It drives **Headscale** (a self-hosted
Tailscale control plane) and installs **Tailscale** on the machines you enroll.
What UMBRA adds on top is accounts, teams, permissions, metrics, and an
enrollment flow that takes one command.

```
    dashboard  ──►  API (AdonisJS)  ──►  Headscale        control plane
                          │                   ▲
                          │                   │ tailscale up
                          ▼                   │
                     Postgres            agent (Go)       on each node
                                              │
    client machine  ═══════════════════════►  node        data plane
                         direct, or relayed through DERP
```

The control plane and the data plane are separate paths, and confusing them is
the single most expensive mistake here — see [DEPLOYMENT.md](DEPLOYMENT.md).

## The agent

`agent/` is a **wrapper around the `tailscale` CLI**, not a WireGuard
implementation. It shells out to `tailscale up`, `tailscale set` and
`tailscale status --json`. The interface on the machine is `tailscale0`.
Keys are generated and rotated by `tailscaled`; UMBRA never sees a private key.

What the agent actually does:

| | |
|---|---|
| `register` | exchanges a one-shot enroll token for a long-lived agent token, then runs `tailscale up` with a pre-auth key the API obtained from Headscale |
| heartbeat | every 30s: metrics, peers read from `tailscale status`, and its own version. Rotates its token when it nears expiry |
| exit node | `--advertise-exit-node` at registration; the API is what actually enables the advertised routes |
| updates | checks `GET /agent/version` every 6h and applies ed25519-signed binaries only |

Anything describing `wgctrl`, an `umbra0` interface, or the agent exchanging
peer lists with the API over `GET /agent/peers` is out of date. That endpoint
was removed.

## Enrollment, end to end

1. The dashboard asks the API for an enroll token (one shot, 1 hour).
2. The user runs `curl -sSL <api>/install.sh | bash -s -- --token=…` on the
   machine. The script installs Tailscale if missing, enables IP forwarding
   persistently, downloads the agent binary from `GET /releases/<file>`, and
   writes a systemd unit.
3. The agent registers. The API creates the node's Headscale user (its tenant)
   if needed, mints a pre-auth key, and returns it.
4. `tailscale up --advertise-exit-node` joins the mesh.
5. The first heartbeat reports the machine's Tailscale IP. The API stores it and
   **enables the advertised exit routes** — Headscale v0.23 `autoApprovers` do
   not work, verified empirically, so this call is the mechanism and not a
   fallback.

## Tenants and isolation

Each account, and each organisation, gets its own **Headscale user**:
`u-<userId>` or `o-<orgId>`. The API generates an ACL policy granting each
tenant access to itself plus `autogroup:internet`, and pushes it to Headscale on
every change. Two tenants cannot see or reach each other at the network level.

Two consequences that have bitten in practice:

- A node re-enrolled under a different account keeps its **original Headscale
  owner** — Headscale identifies a machine by its machine key. The node looks
  healthy and is unreachable. `ensureNodeTenant()` detects and repairs this on
  heartbeat and on connect.
- Deleting an account or an organisation deletes its tenant, which is what makes
  revocation real rather than cosmetic.

## Who can do what

Three layers, each answering a different question. They compose additively: your
permission on a node is the **highest** of everything that grants it, never the
lowest.

| Layer | Question | Values |
|---|---|---|
| Instance | who runs this server? | `operator` / `user` |
| Organisation | who is in this team, and what may they do to it? | `owner` / `admin` / `member` |
| Node | who may use or administer this machine? | `read` / `connect` / `manage` / `admin` |

**The operator holds no node permission at all.** Their powers live on
`/admin/*`, outside `resolveNodePermission`. This is deliberate and structural:
a node is an exit node, so granting the server operator access to one means
letting them route their traffic through a user's home connection. Separate code
paths mean there is nothing to relax.

Node permissions come from three sources — direct ownership, the role you hold
in the org that owns it, and explicit `node_members` grants to you or to an org
you belong to.

Two acts are reserved to **ownership** rather than to the `admin` permission:
extending access (sharing) and giving the node away (transfer). Someone granted
`admin` runs the machine; they do not pass it on. Access spreads from the owner
only, never in a chain the owner cannot see.

## Connecting a client

A client does **not** need the UMBRA agent. `POST /connect` returns a
`tailscale up` command carrying a pre-auth key for the exit node's tenant. Any
machine with Tailscale installed — including the official mobile apps pointed at
your Headscale — can use it.

The API reuses the tenant's outstanding unredeemed key rather than minting one
per click, and expires the surplus.

Sessions are recorded in `connection_logs`. Device attribution and traffic are
filled in afterwards by a sweep: the machine that redeemed the key identifies the
device exactly, and traffic is accumulated from the exit node's peer counters as
clamped deltas, so a `tailscaled` restart cannot wipe or invert a session total.

## Where the specs are wrong

`docs/` is not versioned with this repository and predates the Tailscale
migration. Specifically:

- **`agent/v2.1`** — describes `wgctrl`, kernel netlink and an `umbra0`
  interface. The agent has never worked that way since the migration.
- **`general/v2.1`** — does not contain the word DERP. The relay is what makes
  the product work behind CGNAT; a data-plane chapter is missing entirely.
- **`adonis/v1.1`** — specifies a `headscale_service.registerNode(pubkey, name)`
  that does not exist, and predates `/connect`, `/install.sh`, `/releases/*`,
  the org endpoints and the admin surface.
- **`sql/v3.1`** — `users.exit_node_id`, `instance_role`, `must_change_password`
  and `instance_settings` are missing; the `wireguard_*` columns on `nodes` now
  hold Tailscale values.

Treat this file and [DEPLOYMENT.md](DEPLOYMENT.md) as the current description.
