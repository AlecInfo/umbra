#!/usr/bin/env bash
set -euo pipefail

CDN="https://cdn.umbravpn.io/agent"
BACKEND_URL="https://api.umbravpn.io"
INSTALL_DIR="/usr/local/bin"
SERVICE_FILE="/etc/systemd/system/umbra-agent.service"
LOG_DIR="/var/log/umbra"

TOKEN=""
NAME=""
CATEGORY="other"

for arg in "$@"; do
  case "$arg" in
    --token=*)       TOKEN="${arg#*=}" ;;
    --name=*)        NAME="${arg#*=}" ;;
    --category=*)    CATEGORY="${arg#*=}" ;;
    --backend-url=*) BACKEND_URL="${arg#*=}" ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

if [[ -z "$TOKEN" ]]; then
  echo "Error: --token is required" >&2
  exit 1
fi

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
  x86_64)          SUFFIX="linux-amd64" ;;
  aarch64|arm64)   SUFFIX="linux-arm64" ;;
  armv7l)          SUFFIX="linux-armv7" ;;
  *) echo "Unsupported architecture: $ARCH" >&2; exit 1 ;;
esac

BINARY_URL="$CDN/umbra-agent-$SUFFIX"
CHECKSUM_URL="$CDN/umbra-agent-$SUFFIX.sha256"

echo "→ Downloading umbra-agent ($SUFFIX)..."
curl -fsSL "$BINARY_URL"   -o /tmp/umbra-agent
curl -fsSL "$CHECKSUM_URL" -o /tmp/umbra-agent.sha256

echo "→ Verifying checksum..."
(cd /tmp && sha256sum -c umbra-agent.sha256)

chmod +x /tmp/umbra-agent
mv /tmp/umbra-agent "$INSTALL_DIR/umbra-agent"

echo "→ Registering node (token: ${TOKEN:0:8}...)..."
umbra-agent register --token="$TOKEN" --backend-url="$BACKEND_URL"

mkdir -p "$LOG_DIR"

echo "→ Installing systemd service..."
cat > "$SERVICE_FILE" << 'UNIT'
[Unit]
Description=UMBRA VPN Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/local/bin/umbra-agent start
Restart=on-failure
RestartSec=10
User=root
WatchdogSec=60
StandardOutput=append:/var/log/umbra/agent.log
StandardError=append:/var/log/umbra/agent.log

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/logrotate.d/umbra-agent << 'LOGROTATE'
/var/log/umbra/agent.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    postrotate
        systemctl kill -s HUP umbra-agent.service
    endscript
}
LOGROTATE

systemctl daemon-reload
systemctl enable umbra-agent
systemctl start umbra-agent

echo ""
echo "✓ umbra-agent installed and started"
echo "  Status: systemctl status umbra-agent"
echo "  Logs:   journalctl -u umbra-agent -f"
