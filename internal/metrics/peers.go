package metrics

import (
	"time"

	"golang.zx2c4.com/wireguard/wgctrl"

	"github.com/umbravpn/umbra-agent/internal/api"
)

// GetPeerStats reads current WireGuard peer statistics for the heartbeat payload.
func GetPeerStats(iface string) ([]api.PeerPayload, error) {
	wgClient, err := wgctrl.New()
	if err != nil {
		return nil, err
	}
	defer wgClient.Close()

	device, err := wgClient.Device(iface)
	if err != nil {
		return nil, err
	}

	stats := make([]api.PeerPayload, 0, len(device.Peers))
	for _, p := range device.Peers {
		pp := api.PeerPayload{
			PublicKey:     p.PublicKey.String(),
			BytesSent:     uint64(p.TransmitBytes),
			BytesReceived: uint64(p.ReceiveBytes),
		}
		if !p.LastHandshakeTime.IsZero() {
			pp.LastHandshakeAt = p.LastHandshakeTime.UTC().Format(time.RFC3339)
		}
		stats = append(stats, pp)
	}
	return stats, nil
}

// CountActivePeers returns the number of peers with a handshake in the last 3 minutes.
func CountActivePeers(iface string) int {
	wgClient, err := wgctrl.New()
	if err != nil {
		return 0
	}
	defer wgClient.Close()

	device, err := wgClient.Device(iface)
	if err != nil {
		return 0
	}

	cutoff := time.Now().Add(-3 * time.Minute)
	count := 0
	for _, p := range device.Peers {
		if !p.LastHandshakeTime.IsZero() && p.LastHandshakeTime.After(cutoff) {
			count++
		}
	}
	return count
}
