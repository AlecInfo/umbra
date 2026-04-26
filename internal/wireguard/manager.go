package wireguard

import (
	"fmt"
	"net"
	"os/exec"

	"golang.zx2c4.com/wireguard/wgctrl"
	"golang.zx2c4.com/wireguard/wgctrl/wgtypes"

	"github.com/umbravpn/umbra-agent/internal/config"
)

func Configure(cfg config.WireguardConfig) error {
	if err := ensureInterface(cfg.Interface); err != nil {
		return fmt.Errorf("interface setup: %w", err)
	}
	if err := setAddress(cfg.Interface, cfg.Address); err != nil {
		return fmt.Errorf("address setup: %w", err)
	}

	wgClient, err := wgctrl.New()
	if err != nil {
		return fmt.Errorf("wgctrl: %w", err)
	}
	defer wgClient.Close()

	privKey, err := wgtypes.ParseKey(cfg.PrivateKey)
	if err != nil {
		return fmt.Errorf("invalid private key: %w", err)
	}

	port := cfg.ListenPort
	return wgClient.ConfigureDevice(cfg.Interface, wgtypes.Config{
		PrivateKey: &privKey,
		ListenPort: &port,
	})
}

func Teardown(iface string) {
	exec.Command("ip", "link", "del", iface).Run()
}

func ensureInterface(name string) error {
	if _, err := net.InterfaceByName(name); err == nil {
		return nil
	}
	if out, err := exec.Command("ip", "link", "add", name, "type", "wireguard").CombinedOutput(); err != nil {
		return fmt.Errorf("ip link add: %s: %s", err, out)
	}
	if out, err := exec.Command("ip", "link", "set", name, "up").CombinedOutput(); err != nil {
		return fmt.Errorf("ip link set up: %s: %s", err, out)
	}
	return nil
}

func setAddress(iface, address string) error {
	exec.Command("ip", "addr", "flush", "dev", iface).Run()
	if out, err := exec.Command("ip", "addr", "add", address, "dev", iface).CombinedOutput(); err != nil {
		return fmt.Errorf("ip addr add: %s: %s", err, out)
	}
	return nil
}
