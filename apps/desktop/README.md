# UMBRA app shell

The native shell around the dashboard. Desktop today, phone and tablet from the
same build.

## What is in here

Almost nothing, and that is the point. There is no interface in this directory:
the app **is** `apps/web`, built client-side and embedded. One responsive
codebase serves the browser, the desktop window and the phone, so a screen fixed
in one place is fixed everywhere and there is no second UI drifting behind the
first.

What the shell adds is the one thing a webview cannot do: **drive the
`tailscale` CLI installed on the machine**. UMBRA has no data plane of its own —
Headscale and Tailscale are the VPN — so the connect button here runs the
commands the web dashboard can only hand out as copy-paste.

Tailscale must therefore be present. The connect modal says so when it is not,
instead of failing with a command-not-found.

Commands that change state need root, so they go through `pkexec`: the desktop
shows its own authentication dialog. The app never asks for your password
itself, which is precisely what a VPN client should not teach people to do.

## How the two halves meet

`apps/web` never imports anything from Tauri. It reads the bridge off the
window (`useDesktop()`), which is absent in a browser — there, the modal falls
back to the copy-paste commands. So the web build carries no native code and the
app build needs no separate frontend.

The instance address cannot be baked in: one build is shipped to everyone and
each person runs their own server. It is asked for once, on `/server`, checked
against `/health`, and kept in `localStorage`.

## Running it

```bash
pnpm --filter web build:app   # the embedded frontend, no system libraries needed
pnpm --filter desktop dev     # the actual app
pnpm --filter desktop build   # a bundle
```

The Rust side needs GTK and WebKit development packages:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

## Mobile

The interface is ready — `middleware/device.global.ts` sends narrow viewports to
the mobile pages, so the phone build lands on them by itself. Carrying traffic is
the part that is not: on iOS and Android there is no `tailscale` binary to drive,
and a tunnel means implementing `NEPacketTunnelProvider` or `VpnService` as
native plugins — rebuilding what the Tailscale apps already do.

Until that exists, the mobile build is the dashboard: it manages nodes, and
connecting is done by pointing the official Tailscale app at your Headscale
server.
