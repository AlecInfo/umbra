package cmd

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"syscall"

	"github.com/spf13/cobra"
)

var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Send SIGTERM to the running agent daemon",
	RunE: func(cmd *cobra.Command, args []string) error {
		data, err := os.ReadFile("/run/umbra-agent.pid")
		if err != nil {
			return fmt.Errorf("agent not running (no PID file)")
		}
		pid, err := strconv.Atoi(strings.TrimSpace(string(data)))
		if err != nil {
			return fmt.Errorf("invalid PID file: %w", err)
		}
		proc, err := os.FindProcess(pid)
		if err != nil {
			return fmt.Errorf("process not found: %w", err)
		}
		if err := proc.Signal(syscall.SIGTERM); err != nil {
			return fmt.Errorf("SIGTERM failed: %w", err)
		}
		fmt.Printf("Sent SIGTERM to PID %d\n", pid)
		return nil
	},
}
