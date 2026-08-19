# umbra-agent

The Go agent that runs on every UMBRA node. It enrolls the machine into the
mesh, joins Headscale through the `tailscale` CLI, advertises itself as an exit
node, and reports metrics and peers on a heartbeat.

It is a **wrapper around `tailscale`**, not a WireGuard implementation: the
interface is `tailscale0`, keys are managed by `tailscaled`, and peers come from
`tailscale status --json`. Anything in the older specs describing `wgctrl` or an
`umbra0` interface is out of date.

Linux only, for now: the install script writes a systemd unit and the release
targets are `linux-{amd64,arm64,armv7}`.

## Commands

| | |
|---|---|
| `umbra-agent register --token=<enroll token>` | one-shot enrollment: exchanges the token for a long-lived agent token, then `tailscale up` |
| `umbra-agent start` / `stop` | run or stop the daemon (systemd does this for you) |
| `umbra-agent status` | local state |

Users never type these — the API serves an install script that does the whole
thing:

```bash
curl -sSL https://<your-umbra>/install.sh | bash -s -- --token=<enroll token>
```

## Building releases

```bash
./build-releases.sh
```

Cross-compiles the three targets, signs each binary with ed25519, writes
`manifest.json`, and drops everything into `../apps/api/resources/releases/` —
the directory the API serves `GET /releases/<file>` from, and the one baked into
the API Docker image.

Those artifacts are gitignored on purpose. CI runs **this same script**
(`.github/workflows/deploy.yml`) before building the API image, so the local and
automated paths cannot drift apart. There is no second build recipe.

### The signing key

Every binary embeds the public half of the signing key via ldflags, and the
updater refuses any update not signed by the matching private half — a
compromised distribution server cannot push arbitrary code to your fleet. The
flip side: **lose the private key and every deployed agent is stuck forever on
its current version.** There is no recovery path other than reinstalling each
agent by hand.

- Locally: `~/.config/umbra/agent-signing.pem`, generated on first run. Back it up.
- In CI: the `UMBRA_SIGNING_KEY_B64` repository secret (base64 of the PEM). The
  deploy workflow fails loudly if it is missing rather than minting a throwaway
  key and shipping un-updatable agents.

### Versions

`build-releases.sh` injects the version into the binary *and* writes it to the
manifest from the same source, so `GET /agent/version` and the agent's own
`version.Current` can never disagree. Bump `internal/version/version.go`, or
override with `UMBRA_VERSION=1.2.0` for a one-off build.
