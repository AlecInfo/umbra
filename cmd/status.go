package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"

	"github.com/spf13/cobra"

	"github.com/umbravpn/umbra-agent/internal/config"
)

var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show agent configuration and running status",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			fmt.Println("Not registered — no config found at", config.ConfigPath)
			return nil
		}

		fmt.Printf("Node ID:      %s\n", cfg.NodeID)
		fmt.Printf("Node Name:    %s\n", cfg.NodeName)
		fmt.Printf("Backend URL:  %s\n", cfg.BackendURL)
		fmt.Printf("WG Interface: %s\n", cfg.Wireguard.Interface)
		fmt.Printf("WG Address:   %s\n", cfg.Wireguard.Address)
		fmt.Printf("WG Port:      %d\n", cfg.Wireguard.ListenPort)
		fmt.Printf("Auto-update:  %v\n", cfg.AutoUpdate)
		fmt.Printf("Log Level:    %s\n", cfg.LogLevel)

		data, err := os.ReadFile("/run/umbra-agent.pid")
		if err != nil {
			fmt.Println("Status:       stopped")
			return nil
		}
		pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
		if err != nil {
			fmt.Println("Status:       stopped (invalid PID)")
			return nil
		}
		proc, err := os.FindProcess(pid)
		if err != nil || proc.Signal(syscall.Signal(0)) != nil {
			fmt.Println("Status:       stopped")
		} else {
			fmt.Printf("Status:       running (PID %d)\n", pid)
		}
		return nil
	},
}
