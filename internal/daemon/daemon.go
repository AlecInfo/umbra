package daemon

import (
	"context"
	"fmt"
	"os"
	"time"

	sysd "github.com/coreos/go-systemd/v22/daemon"
	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/heartbeat"
	"github.com/umbravpn/umbra-agent/internal/updater"
	"github.com/umbravpn/umbra-agent/internal/wireguard"
)

const pidFile = "/run/umbra-agent.pid"

func Run(ctx context.Context, cfg *config.Config, logger *zap.Logger) error {
	if err := os.WriteFile(pidFile, []byte(fmt.Sprintf("%d\n", os.Getpid())), 0644); err != nil {
		logger.Warn("failed to write PID file", zap.Error(err))
	}
	defer os.Remove(pidFile)

	client := api.NewClient(cfg.BackendURL, cfg.AuthToken)
	buf := heartbeat.NewBuffer()

	backoff := 30 * time.Second

	heartbeatTicker := time.NewTicker(time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second)
	peerSyncTicker := time.NewTicker(5 * time.Minute)
	watchdogTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()
	defer peerSyncTicker.Stop()
	defer watchdogTicker.Stop()

	if cfg.AutoUpdate {
		updateTicker := time.NewTicker(6 * time.Hour)
		defer updateTicker.Stop()
		go func() {
			for {
				select {
				case <-ctx.Done():
					return
				case <-updateTicker.C:
					if err := updater.CheckAndUpdate(client, logger); err != nil {
						logger.Warn("auto-update check failed", zap.Error(err))
					}
				}
			}
		}()
	}

	sysd.SdNotify(false, sysd.SdNotifyReady)
	logger.Info("umbra-agent started", zap.String("node_id", cfg.NodeID))

	for {
		select {
		case <-ctx.Done():
			logger.Info("shutting down")
			wireguard.Teardown(cfg.Wireguard.Interface)
			return nil

		case <-heartbeatTicker.C:
			go func() {
				// Drain buffer from previous failures first
				if buf.Len() > 0 {
					snaps := buf.Flush()
					if err := heartbeat.FlushBuffer(client, snaps, logger); err != nil {
						logger.Warn("buffer flush failed, re-buffering", zap.Error(err))
						for _, s := range snaps {
							buf.Push(s)
						}
						return
					}
				}

				resp, err := heartbeat.Send(client, cfg, logger)
				if err != nil {
					logger.Warn("heartbeat failed",
						zap.Error(err),
						zap.Duration("next_retry", backoff),
					)
					backoff = min(backoff*2, 300*time.Second)
					return
				}
				backoff = 30 * time.Second

				// JWT rotation — backend sends new token when < 7 days remain
				if resp.NewToken != nil {
					cfg.AuthToken = *resp.NewToken
					client.UpdateToken(*resp.NewToken)
					if err := config.Write(cfg); err != nil {
						logger.Error("failed to persist rotated token", zap.Error(err))
					}
				}

				// Immediate peer sync when backend signals a change
				if resp.PeersUpdated {
					if err := wireguard.SyncPeers(client, cfg); err != nil {
						logger.Error("immediate peer sync failed", zap.Error(err))
					}
				}
			}()

		case <-peerSyncTicker.C:
			go func() {
				if err := wireguard.SyncPeers(client, cfg); err != nil {
					logger.Error("periodic peer sync failed", zap.Error(err))
				}
			}()

		case <-watchdogTicker.C:
			sysd.SdNotify(false, "WATCHDOG=1")
		}
	}
}
