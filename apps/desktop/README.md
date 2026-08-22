# UMBRA desktop client

Connects this machine to an exit node of your UMBRA instance, without ever
opening a terminal.

## What it is, and what it is not

It **drives the `tailscale` CLI already installed on the machine**. UMBRA has no
data plane of its own — Headscale and Tailscale are the VPN — so this client is
the front-end that runs, on your behalf, the commands the dashboard used to hand
out as copy-paste.

That means Tailscale must be installed. The window says so and links to the
download when it is missing.

Commands that change state need root, so they go through `pkexec`: the desktop
shows its own authentication dialog. The app never asks for your password
itself, which is precisely what a VPN client should not teach people to do.

## Mobile

Not this codebase. Tauri 2 does build for iOS and Android, but carrying traffic
through a tunnel there means implementing `NEPacketTunnelProvider` or
`VpnService` as native plugins — rebuilding what the Tailscale apps already do.
On mobile, point the official Tailscale app at your Headscale server.

## Running it

```bash
pnpm --filter desktop build      # frontend only, no system libraries needed
pnpm --filter desktop tauri dev  # the actual app
```

The Rust side needs GTK and WebKit development packages:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

On first launch the app asks for your instance URL (`https://umbra.example.com`,
the `/api/v1` suffix is added for you), then your credentials. Both the server
and the session token are stored on disk by the Tauri store plugin, so the app
does not ask again every time it starts.
