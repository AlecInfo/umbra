package heartbeat

import (
	"fmt"
	"os/exec"
	"strings"
	"time"

	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/metrics"
	"github.com/umbravpn/umbra-agent/internal/version"
)

const bufferSize = 100

type Buffer struct {
	snapshots []api.HeartbeatRequest
}

func NewBuffer() *Buffer {
	return &Buffer{}
}

func (b *Buffer) Push(s api.HeartbeatRequest) {
	if len(b.snapshots) >= bufferSize {
		b.snapshots = b.snapshots[1:]
	}
	b.snapshots = append(b.snapshots, s)
}

func (b *Buffer) Flush() []api.HeartbeatRequest {
	snaps := b.snapshots
	b.snapshots = nil
	return snaps
}

func (b *Buffer) Len() int {
	return len(b.snapshots)
}

// Send collects a metrics snapshot and posts it as a heartbeat.
func Send(client *api.Client, cfg *config.Config, logger *zap.Logger) (*api.HeartbeatResponse, error) {
	snap, err := metrics.Collect(cfg.Tailscale.Interface)
	if err != nil {
		return nil, fmt.Errorf("collect metrics: %w", err)
	}

	peerStats, _ := metrics.GetPeerStats(cfg.Tailscale.Interface)

	payload := snap.ToPayload()
	payload.LatencyMs = measureLatency(client.BackendURL)
	payload.TailscaleIP = getTailscaleIP()

	req := api.HeartbeatRequest{
		NodeID:       cfg.NodeID,
		Timestamp:    time.Now().UTC().Format(time.RFC3339),
		Metrics:      payload,
		Peers:        peerStats,
		AgentVersion: version.Current,
	}

	return client.Heartbeat(req)
}

func measureLatency(backendURL string) int64 {
	start := time.Now()
	c := api.NewClient(backendURL, "")
	if err := c.Ping(); err != nil {
		return 0
	}
	ms := time.Since(start).Milliseconds()
	if ms <= 0 || ms > 30000 {
		return 0
	}
	return ms
}

// getTailscaleIP returns the node's Tailscale/Headscale-assigned IP (e.g. "100.64.0.3").
func getTailscaleIP() string {
	out, err := exec.Command("tailscale", "ip", "-4").Output()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

// FlushBuffer sends buffered snapshots in batches of 10, with 500ms between batches.
func FlushBuffer(client *api.Client, buf []api.HeartbeatRequest, logger *zap.Logger) error {
	for i := 0; i < len(buf); i += 10 {
		end := i + 10
		if end > len(buf) {
			end = len(buf)
		}
		if err := client.PostMetricsBatch(buf[i:end]); err != nil {
			return err
		}
		time.Sleep(500 * time.Millisecond)
	}
	logger.Info("flushed buffered snapshots", zap.Int("count", len(buf)))
	return nil
}
