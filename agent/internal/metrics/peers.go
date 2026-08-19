package metrics

import (
	"encoding/json"
	"os/exec"
	"time"

	"github.com/umbravpn/umbra-agent/internal/api"
)

type tailscaleStatus struct {
	Peer map[string]struct {
		PublicKey     string    `json:"PublicKey"`
		HostName      string    `json:"HostName"`
		TailscaleIPs  []string  `json:"TailscaleIPs"`
		CurAddr       string    `json:"CurAddr"`
		Relay         string    `json:"Relay"`
		RxBytes       int64     `json:"RxBytes"`
		TxBytes       int64     `json:"TxBytes"`
		LastHandshake time.Time `json:"LastHandshake"`
		Active        bool      `json:"Active"`
	} `json:"Peer"`
}

// GetPeerStats reads peer statistics from `tailscale status --json`.
// Works with both kernel and userspace WireGuard (TUN mode).
func GetPeerStats(_ string) ([]api.PeerPayload, error) {
	out, err := exec.Command("tailscale", "status", "--json").Output()
	if err != nil {
		return nil, err
	}
	var st tailscaleStatus
	if err := json.Unmarshal(out, &st); err != nil {
		return nil, err
	}

	stats := make([]api.PeerPayload, 0, len(st.Peer))
	for _, p := range st.Peer {
		pp := api.PeerPayload{
			PublicKey:     p.PublicKey,
			Name:          p.HostName,
			AllowedIPs:    p.TailscaleIPs,
			Endpoint:      peerEndpoint(p.CurAddr, p.Relay),
			BytesSent:     uint64(p.TxBytes),
			BytesReceived: uint64(p.RxBytes),
		}
		zero := time.Time{}
		if p.LastHandshake != zero {
			pp.LastHandshakeAt = p.LastHandshake.UTC().Format(time.RFC3339)
		}
		stats = append(stats, pp)
	}
	return stats, nil
}

// peerEndpoint describes how this peer is actually reached. CurAddr is set
// only for a direct UDP path; when hole punching fails the traffic goes
// through a DERP region instead, which is worth surfacing — it is the
// difference between a fast link and a relayed one.
func peerEndpoint(curAddr, relay string) string {
	if curAddr != "" {
		return curAddr
	}
	if relay != "" {
		return "derp:" + relay
	}
	return ""
}

// CountActivePeers returns the number of currently active Tailscale peers.
func CountActivePeers(_ string) int {
	out, err := exec.Command("tailscale", "status", "--json").Output()
	if err != nil {
		return 0
	}
	var st tailscaleStatus
	if err := json.Unmarshal(out, &st); err != nil {
		return 0
	}
	count := 0
	for _, p := range st.Peer {
		if p.Active {
			count++
		}
	}
	return count
}
