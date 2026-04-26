package cmd

import (
	"fmt"

	"github.com/spf13/cobra"

	"github.com/umbravpn/umbra-agent/internal/registration"
)

var (
	registerToken      string
	registerBackendURL string
)

var registerCmd = &cobra.Command{
	Use:   "register",
	Short: "Register this node with the UMBRA backend (one-time)",
	RunE: func(cmd *cobra.Command, args []string) error {
		if registerToken == "" {
			return fmt.Errorf("--token is required")
		}
		return registration.Register(registerToken, registerBackendURL)
	},
}

func init() {
	registerCmd.Flags().StringVar(&registerToken, "token", "", "One-time enrollment token (required)")
	registerCmd.Flags().StringVar(&registerBackendURL, "backend-url", "https://api.umbravpn.io", "Backend URL")
}
