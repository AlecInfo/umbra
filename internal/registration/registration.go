package registration

import (
	"fmt"
	"os"
	"os/exec"
	"runtime"
	"strings"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/version"
)

func Register(token, backendURL string, isLocalClient bool) error {
	hostname, _ := os.Hostname()
	client := api.NewClient(backendURL, "")

	resp, err := client.Register(api.RegisterRequest{
		Token:         token,
		Hostname:      hostname,
		HardwareModel: detectHardwareModel(),
		Arch:          detectArch(),
		OsVersion:     detectOSVersion(),
		AgentVersion:  version.Current,
		IpAddress:     detectPrimaryIP(),
	})
	if err != nil {
		return fmt.Errorf("registration failed: %w", err)
	}

	cfg := &config.Config{
		NodeID:     resp.NodeID,
		BackendURL: backendURL,
		AuthToken:  resp.AuthToken,
		Tailscale: config.TailscaleConfig{
			HeadscaleURL: resp.HeadscaleURL,
			Hostname:     resp.NodeID,
			Interface:    "tailscale0",
		},
		HeartbeatIntervalSeconds: 10,
		AutoUpdate:               false,
		LogLevel:                 "info",
		IsLocalClient:            isLocalClient,
	}

	if err := config.Write(cfg); err != nil {
		return fmt.Errorf("config write failed: %w", err)
	}

	if resp.HeadscaleAuthKey != "" {
		if err := tailscaleUp(resp.HeadscaleURL, resp.HeadscaleAuthKey, resp.NodeID, !isLocalClient); err != nil {
			return fmt.Errorf("tailscale up failed: %w", err)
		}
		fmt.Printf("✓ Node registered: %s\n", resp.NodeID)
		fmt.Printf("✓ Tailscale joined Headscale at %s\n", resp.HeadscaleURL)
	} else {
		fmt.Printf("✓ Node registered: %s (Headscale not configured on server)\n", resp.NodeID)
	}

	fmt.Println("→ Start the agent with: umbra-agent start")
	return nil
}

// tailscaleUp joins Headscale via `tailscale up`. advertiseExit=true on server/exit nodes.
func tailscaleUp(headscaleURL, authKey, hostname string, advertiseExit bool) error {
	args := []string{
		"up",
		"--reset",
		"--login-server=" + headscaleURL,
		"--authkey=" + authKey,
		"--hostname=" + hostname,
		"--accept-routes",
		"--accept-dns=false",
	}
	if advertiseExit {
		args = append(args, "--advertise-exit-node")
	}
	out, err := exec.Command("tailscale", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(out)), err)
	}
	return nil
}

func detectHardwareModel() string {
	if data, err := os.ReadFile("/proc/device-tree/model"); err == nil {
		return strings.TrimRight(string(data), "\x00\n")
	}
	if data, err := os.ReadFile("/sys/class/dmi/id/product_name"); err == nil {
		if p := strings.TrimSpace(string(data)); p != "" {
			return p
		}
	}
	return ""
}

func detectArch() string {
	return runtime.GOARCH
}

func detectPrimaryIP() string {
	out, err := exec.Command("ip", "route", "get", "8.8.8.8").Output()
	if err != nil {
		return ""
	}
	fields := strings.Fields(string(out))
	for i, f := range fields {
		if f == "src" && i+1 < len(fields) {
			return fields[i+1]
		}
	}
	return ""
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
