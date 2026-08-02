package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/umbravpn/umbra-agent/internal/registration"
)

var (
	registerToken       string
	registerBackendURL  string
	registerLocalClient bool
)

var registerCmd = &cobra.Command{
	Use:   "register",
	Short: "Register this node with the UMBRA backend (one-time)",
	RunE: func(cmd *cobra.Command, args []string) error {
		if registerToken == "" {
			return fmt.Errorf("--token is required")
		}
		return registration.Register(registerToken, registerBackendURL, registerLocalClient)
	},
}

func init() {
	registerCmd.Flags().StringVar(&registerToken, "token", "", "One-time enrollment token (required)")
	registerCmd.Flags().StringVar(&registerBackendURL, "backend-url", "https://api.umbravpn.io/api/v1", "Backend API base URL")
	registerCmd.Flags().BoolVar(&registerLocalClient, "local", false, "Mark this machine as a local VPN client (apply exit node routing)")
}
