#!/usr/bin/env bash
set -euo pipefail

# ── Parse arguments ─────────────────────────────────────────────────────────
NAME=""
CATEGORY="other"
TOKEN=""
BACKEND_URL="__BACKEND_URL__"
IS_LOCAL=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --name=*)        NAME="${1#*=}" ;;
    --name)          NAME="$2"; shift ;;
    --category=*)    CATEGORY="${1#*=}" ;;
    --category)      CATEGORY="$2"; shift ;;
    --token=*)       TOKEN="${1#*=}" ;;
    --token)         TOKEN="$2"; shift ;;
    --backend-url=*) BACKEND_URL="${1#*=}" ;;
    --backend-url)   BACKEND_URL="$2"; shift ;;
    --local)         IS_LOCAL=true ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
  shift
done

if [[ -z "$TOKEN" ]]; then
  echo "❌ --token is required"
  exit 1
fi

# ── Detect architecture ──────────────────────────────────────────────────────
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)  ARCH_TAG="linux-amd64" ;;
  aarch64) ARCH_TAG="linux-arm64" ;;
  armv7l)  ARCH_TAG="linux-armv7" ;;
  *) echo "❌ Unsupported architecture: $ARCH"; exit 1 ;;
esac

AGENT_BIN="/usr/local/bin/umbra-agent"

# ── Install Tailscale if not present ────────────────────────────────────────
if ! command -v tailscale >/dev/null 2>&1; then
  echo "→ Installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
fi
sudo systemctl enable --now tailscaled

# ── Enable IP forwarding (required for exit-node routing) ───────────────────
echo "→ Enabling IP forwarding..."
printf 'net.ipv4.ip_forward = 1\nnet.ipv6.conf.all.forwarding = 1\n' \
  | sudo tee /etc/sysctl.d/99-umbra.conf >/dev/null
sudo sysctl -p /etc/sysctl.d/99-umbra.conf

# ── Install umbra-agent if not present ──────────────────────────────────────
if [[ ! -f "$AGENT_BIN" ]]; then
  echo "→ Downloading umbra-agent ($ARCH_TAG)..."
  RELEASE_URL="${BACKEND_URL}/releases/umbra-agent-${ARCH_TAG}"
  curl -fsSL "$RELEASE_URL" -o /tmp/umbra-agent
  chmod +x /tmp/umbra-agent
  sudo mv /tmp/umbra-agent "$AGENT_BIN"
  echo "✓ umbra-agent installed"
else
  echo "✓ umbra-agent already installed"
fi

# ── Stop existing service and clear old config ──────────────────────────────
if systemctl is-active --quiet umbra-agent 2>/dev/null; then
  sudo systemctl stop umbra-agent
fi
sudo rm -f /etc/umbra/agent.json

# ── Register with the Umbra backend ─────────────────────────────────────────
echo "→ Registering node..."
REGISTER_ARGS=(
  "register"
  "--token=$TOKEN"
  "--backend-url=${BACKEND_URL}/api/v1"
)
if $IS_LOCAL; then
  REGISTER_ARGS+=("--local")
fi
sudo "$AGENT_BIN" "${REGISTER_ARGS[@]}"

# ── Create systemd service (always rewritten so updates propagate) ──────────
sudo mkdir -p /var/log/umbra
sudo tee /etc/systemd/system/umbra-agent.service > /dev/null <<'SERVICE'
[Unit]
Description=Umbra VPN Agent
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/umbra-agent start
Restart=on-failure
RestartSec=5s
WatchdogSec=60
StandardOutput=append:/var/log/umbra/agent.log
StandardError=append:/var/log/umbra/agent.log

[Install]
WantedBy=multi-user.target
SERVICE

sudo tee /etc/logrotate.d/umbra-agent > /dev/null <<'LOGROTATE'
/var/log/umbra/agent.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
LOGROTATE

sudo systemctl daemon-reload
sudo systemctl enable umbra-agent
sudo systemctl restart umbra-agent
echo ""
echo "✓ Node registered and agent started."
echo "→ Check status: sudo systemctl status umbra-agent"
