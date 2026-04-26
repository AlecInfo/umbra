package registration

import (
	"fmt"
	"os"
	"runtime"
	"strings"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/version"
	"github.com/umbravpn/umbra-agent/internal/wireguard"
)

func Register(token, backendURL string) error {
	keys, err := wireguard.GenerateKeyPair()
	if err != nil {
		return fmt.Errorf("keygen failed: %w", err)
	}

	hostname, _ := os.Hostname()
	client := api.NewClient(backendURL, "")

	resp, err := client.Register(api.RegisterRequest{
		Token:           token,
		WireguardPubkey: keys.Public,
		Hostname:        hostname,
		HardwareModel:   detectHardwareModel(),
		OsVersion:       detectOSVersion(),
		AgentVersion:    version.Current,
		SupportsOpenVPN: false,
	})
	if err != nil {
		return fmt.Errorf("registration failed: %w", err)
	}

	cfg := &config.Config{
		NodeID:     resp.NodeID,
		BackendURL: backendURL,
		AuthToken:  resp.AuthToken,
		Wireguard: config.WireguardConfig{
			Interface:  resp.Wireguard.Interface,
			PrivateKey: keys.Private,
			ListenPort: resp.Wireguard.ListenPort,
			Address:    resp.Wireguard.Address,
		},
		HeartbeatIntervalSeconds: 30,
		AutoUpdate:               false,
		LogLevel:                 "info",
	}

	if err := config.Write(cfg); err != nil {
		return fmt.Errorf("config write failed: %w", err)
	}

	if err := wireguard.Configure(cfg.Wireguard); err != nil {
		return fmt.Errorf("wireguard setup failed: %w", err)
	}

	fmt.Printf("✓ Node registered: %s\n", resp.NodeID)
	fmt.Printf("✓ WireGuard configured: %s (%s)\n", resp.Wireguard.Interface, resp.Wireguard.Address)
	fmt.Println("→ Start the agent with: umbra-agent start")
	return nil
}

func detectHardwareModel() string {
	if data, err := os.ReadFile("/proc/device-tree/model"); err == nil {
		return strings.TrimRight(string(data), "\x00\n")
	}
	return runtime.GOARCH
}

func detectOSVersion() string {
	if data, err := os.ReadFile("/etc/os-release"); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			if strings.HasPrefix(line, "PRETTY_NAME=") {
				return strings.Trim(strings.TrimPrefix(line, "PRETTY_NAME="), "\"")
			}
		}
	}
	return runtime.GOOS
}
