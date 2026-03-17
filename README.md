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

UMBRA is a self-hosted VPN manager built on **WireGuard** and **Headscale**. Deploy lightweight agents on machines you already own to form a private mesh network — your traffic never touches a server you don't control.

- **Self-hosted** — Run the control plane on your own infrastructure. No third-party dependency.
- **WireGuard-powered** — Fast, modern, audited tunneling protocol with kernel-level performance.
- **Mesh topology** — Nodes connect directly to each other via Headscale. No single point of failure.
- **Multi-platform agent** — Lightweight Go agent for Linux, macOS, and Windows.
- **Web dashboard** — Real-time monitoring, node management, and team access control.
- **Flexible deployment** — Full self-hosted, hybrid, or cloud-assisted. You choose.

## Architecture

```
umbra/
├── apps/
│   ├── web/             Nuxt 4 dashboard (main frontend)
│   ├── landing/         Marketing site (umbravpn.io)
│   └── api/             AdonisJS 6 API              (planned)
├── packages/
│   └── types/           Shared TypeScript types
└── umbra-agent/         Go system agent              (planned)
```

### Tech stack

| Layer         | Stack                                  |
|---------------|----------------------------------------|
| **Dashboard** | Nuxt 4, Nuxt UI, Pinia, Tailwind CSS 4 |
| **Landing**   | Nuxt 4, cobe (3D globe)                |
| **API**       | AdonisJS 6                             |
| **Agent**     | Go                                     |
| **VPN**       | WireGuard + Headscale                  |
| **Desktop**   | Tauri 2                                |
| **Mobile**    | Capacitor 6                            |

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

## License

This project is licensed under the Apache License 2.0 — see the [LICENSE](LICENSE) file for details.

<p align="right">(<a href="#readme-top">Back to top</a>)</p>

---

> GitHub [@AlecInfo](https://github.com/AlecInfo) &nbsp;&middot;&nbsp; Website [umbravpn.io](https://umbravpn.io)
