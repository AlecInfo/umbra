package cmd

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/spf13/cobra"
	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/daemon"
)

var startCmd = &cobra.Command{
	Use:   "start",
	Short: "Start the UMBRA agent daemon",
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := config.Load()
		if err != nil {
			return err
		}

		logger, err := buildLogger(cfg.LogLevel)
		if err != nil {
			return err
		}
		defer logger.Sync()

		ctx, cancel := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
		defer cancel()

		return daemon.Run(ctx, cfg, logger)
	},
}

func buildLogger(level string) (*zap.Logger, error) {
	if level == "debug" {
		return zap.NewDevelopment()
	}
	return zap.NewProduction()
}
