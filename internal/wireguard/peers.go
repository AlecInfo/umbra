package wireguard

import (
	"fmt"
	"net"

	"golang.zx2c4.com/wireguard/wgctrl"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
)

// SyncPeers fetches the authoritative peer list from the backend and applies it
// atomically to the WireGuard interface, removing any unlisted peers.
func SyncPeers(client *api.Client, cfg *config.Config) error {
	remotePeers, err := client.GetPeers()
	if err != nil {
		return err
	}

	wgClient, err := wgctrl.New()
	if err != nil {
		return fmt.Errorf("wgctrl: %w", err)
	}
	defer wgClient.Close()

	peers, err := toWGPeers(remotePeers.Peers)
	if err != nil {
		return err
	}

	// ReplacePeers:true is the atomic replace — absent peers are removed.
	return wgClient.ConfigureDevice(cfg.Wireguard.Interface, wgtypes.Config{
		Peers:        peers,
		ReplacePeers: true,
	})
}

func toWGPeers(apiPeers []api.WireguardPeer) ([]wgtypes.PeerConfig, error) {
	peers := make([]wgtypes.PeerConfig, 0, len(apiPeers))
	for _, p := range apiPeers {
		pub, err := wgtypes.ParseKey(p.PublicKey)
		if err != nil {
			return nil, fmt.Errorf("invalid peer pubkey %q: %w", p.PublicKey, err)
		}

		allowedIPs := make([]net.IPNet, 0, len(p.AllowedIPs))
		for _, cidr := range p.AllowedIPs {
			_, ipNet, err := net.ParseCIDR(cidr)
			if err != nil {
				return nil, fmt.Errorf("invalid CIDR %q: %w", cidr, err)
			}
			allowedIPs = append(allowedIPs, *ipNet)
		}

		var endpoint *net.UDPAddr
		if p.Endpoint != "" {
			endpoint, err = net.ResolveUDPAddr("udp", p.Endpoint)
			if err != nil {
				return nil, fmt.Errorf("invalid endpoint %q: %w", p.Endpoint, err)
			}
		}

		peers = append(peers, wgtypes.PeerConfig{
			PublicKey:         pub,
			AllowedIPs:        allowedIPs,
			Endpoint:          endpoint,
			ReplaceAllowedIPs: true,
		})
	}
	return peers, nil
}
