<a name="readme-top"></a>

<h1 align="center">
  <br>
    <img src="apps/landing/public/favicon.svg" alt="Logo" width="128">
  <br>
</h1>

<h1 align="center">UMBRA</h1>

<p align="center">
  <a href="https://umbravpn.io"><img src="https://img.shields.io/badge/website-umbravpn.io-4fffb0?style=for-the-badge" alt="Website"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue?style=for-the-badge" alt="License"></a>
  <a href="https://github.com/AlecInfo/umbra/actions"><img src="https://img.shields.io/github/actions/workflow/status/AlecInfo/umbra/deploy-landing.yml?style=for-the-badge&label=deploy" alt="Deploy"></a>
</p>

<p align="center">
  <a href="#description">Description</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment-models">Deployment Models</a> •
  <a href="#roadmap">Roadmap</a> •
  <a href="#license">License</a>
</p>

## Description

UMBRA is a self-hosted VPN manager built on **Headscale** and **Tailscale**, which run
on WireGuard. Enroll machines you already own as exit nodes, and route your traffic
through your own hardware instead of somebody else's.

- **Self-hosted, on your hardware** — the control plane runs on your infrastructure.
  Headscale, Postgres and the API are the whole server side; no third-party service is in
  the path. Images are published for amd64 and arm64, so a Raspberry Pi is as valid a
  host as a mini PC or a VPS.
- **WireGuard under the hood** — via Tailscale, so NAT traversal, key rotation and
  rekeying are handled rather than reimplemented.
- **Works behind CGNAT** — when two machines cannot reach each other directly, traffic is
  relayed through a DERP server. This is what makes a home connection usable as an exit
  node; see [DEPLOYMENT.md](DEPLOYMENT.md), it constrains how you expose Headscale.
- **One-command enrollment** — `curl … | bash` on a fresh machine installs the agent,
  installs Tailscale, enables IP forwarding and joins the mesh.
- **Three layers of access** — instance operator, team roles, and per-node permissions;
  see [ARCHITECTURE.md](ARCHITECTURE.md).
- **Web dashboard** — node metrics, connection history, teams and sharing.

**Status:** the agent is **Linux only** (systemd, amd64/arm64/armv7). The desktop client
is early but functional. There is no mobile client: carrying traffic through a tunnel on
iOS or Android means reimplementing what the Tailscale apps already do, so point the
official Tailscale app at your own server instead. Connecting without the desktop client
still works too: connecting a client today means running a `tailscale up`
command the dashboard hands you, or using the official Tailscale app pointed at your
own server.

## Architecture

```
umbra/
├── apps/
│   ├── web/             Nuxt 4 dashboard (main frontend)
│   ├── landing/         Marketing site (umbravpn.io)
│   ├── desktop/         Tauri 2 client — see apps/desktop/README.md
│   └── api/             AdonisJS 6 API
├── packages/
│   └── types/           Shared TypeScript types
└── agent/               Go system agent — see agent/README.md
```

### Tech stack

| Layer         | Stack                                  |
|---------------|----------------------------------------|
| **Dashboard** | Nuxt 4, Nuxt UI, Pinia, Tailwind CSS 4 |
| **Landing**   | Nuxt 4, cobe (3D globe)                |
| **API**       | AdonisJS 6                             |
| **Agent**     | Go                                     |
| **VPN**       | Headscale + Tailscale (WireGuard)      |
| **Relay**     | DERP (embedded, or a standalone derper)|
| **Client**    | Tauri 2 desktop, driving the local Tailscale |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 10

### Installation

1. Clone the repository to your local machine.

    ```bash
    git clone https://github.com/AlecInfo/umbra.git
    ```

2. Install dependencies.

    ```bash
    cd umbra && pnpm install
    ```

3. Run the web dashboard or the landing page.

    ```bash
    # Web dashboard
    pnpm web

    # Landing page
    pnpm landing
    ```

## Deployment Models

| Model                | Control plane | Nodes         | Best for                  |
|----------------------|---------------|---------------|---------------------------|
| **Full self-hosted** | Your server   | Your devices  | Privacy maximalists       |
| **Half self-hosted** | UMBRA cloud   | Your devices  | Easy setup, your hardware |
| **Full cloud**       | UMBRA cloud   | UMBRA + yours | Fastest onboarding        |

Running the whole stack — **[DEPLOYMENT.md](DEPLOYMENT.md)**. Read it before
putting Headscale behind a reverse proxy: it cannot carry the DERP relay, and
clients behind CGNAT will silently fail to connect.

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

<p align="right">(<a href="#readme-top">Back to top</a>)</p>

---

> GitHub [@AlecInfo](https://github.com/AlecInfo) &nbsp;&middot;&nbsp; Website [umbravpn.io](https://umbravpn.io)
