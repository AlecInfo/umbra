package daemon

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	sysd "github.com/coreos/go-systemd/v22/daemon"
	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
	"github.com/umbravpn/umbra-agent/internal/heartbeat"
	"github.com/umbravpn/umbra-agent/internal/remoteconfig"
	"github.com/umbravpn/umbra-agent/internal/updater"
)

const pidFile = "/run/umbra-agent.pid"

func exitNodeChanged(current, next *string) bool {
	if current == nil && next == nil {
		return false
	}
	if current == nil || next == nil {
		return true
	}
	return *current != *next
}

func Run(ctx context.Context, cfg *config.Config, logger *zap.Logger) error {
	if err := os.WriteFile(pidFile, []byte(fmt.Sprintf("%d\n", os.Getpid())), 0644); err != nil {
		logger.Warn("failed to write PID file", zap.Error(err))
	}
	defer os.Remove(pidFile)

	client := api.NewClient(cfg.BackendURL, cfg.AuthToken)
	buf := heartbeat.NewBuffer()

	var currentExitHostname *string

	backoff := 30 * time.Second

	// cfg is now written from heartbeat goroutines (token rotation, settings
	// sent by the server) while others read it: every access goes through cfgMu.
	var cfgMu sync.Mutex
	snapshot := func() config.Config {
		cfgMu.Lock()
		defer cfgMu.Unlock()
		return *cfg
	}

	heartbeatTicker := time.NewTicker(time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second)
	watchdogTicker := time.NewTicker(30 * time.Second)
	defer heartbeatTicker.Stop()
	defer watchdogTicker.Stop()

	// The interval can change from the dashboard; only this loop owns the ticker.
	intervalCh := make(chan time.Duration, 1)

	// Auto-update can be switched on and off from the dashboard, so the
	// updater always runs and asks the flag at each tick. Switching it on also
	// checks right away rather than up to six hours later.
	var autoUpdate atomic.Bool
	autoUpdate.Store(cfg.AutoUpdate)
	checkNow := make(chan struct{}, 1)
	go func() {
		updateTicker := time.NewTicker(6 * time.Hour)
		defer updateTicker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-updateTicker.C:
			case <-checkNow:
			}
			if !autoUpdate.Load() {
				continue
			}
			if err := updater.CheckAndUpdate(client, logger); err != nil {
				logger.Warn("auto-update check failed", zap.Error(err))
			}
		}
	}()

	sysd.SdNotify(false, sysd.SdNotifyReady)
	logger.Info("umbra-agent started", zap.String("node_id", cfg.NodeID))

	for {
		select {
		case <-ctx.Done():
			logger.Info("shutting down")
			return nil

		case d := <-intervalCh:
			heartbeatTicker.Reset(d)
			logger.Info("heartbeat interval changed", zap.Duration("interval", d))

		case <-heartbeatTicker.C:
			go func() {
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

				current := snapshot()
				resp, err := heartbeat.Send(client, &current, logger)
				if err != nil {
					logger.Warn("heartbeat failed",
						zap.Error(err),
						zap.Duration("next_retry", backoff),
					)
					backoff = min(backoff*2, 300*time.Second)
					return
				}
				backoff = 30 * time.Second

				cfgMu.Lock()
				dirty := false
				if resp.NewToken != nil {
					cfg.AuthToken = *resp.NewToken
					client.UpdateToken(*resp.NewToken)
					dirty = true
				}
				changes := remoteconfig.Apply(cfg, resp.Config)
				if changes.Interval {
					select {
					case intervalCh <- time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second:
					default: // a change is already queued; the next heartbeat re-sends it
					}
				}
				if changes.AutoUpdate {
					autoUpdate.Store(cfg.AutoUpdate)
					logger.Info("auto-update changed", zap.Bool("enabled", cfg.AutoUpdate))
					if cfg.AutoUpdate {
						select {
						case checkNow <- struct{}{}:
						default:
						}
					}
				}
				if dirty || changes.Any() {
					if err := config.Write(cfg); err != nil {
						logger.Error("failed to persist config", zap.Error(err))
					}
				}
				isLocalClient := cfg.IsLocalClient
				cfgMu.Unlock()

				// Exit node management via tailscale CLI (uses Tailscale IP, not hostname/UUID)
				if isLocalClient {
					newIP := resp.ExitNodeIP
					if exitNodeChanged(currentExitHostname, newIP) {
						if newIP == nil || *newIP == "" {
							logger.Info("clearing exit node")
							if err := setExitNode(""); err != nil {
								logger.Error("tailscale clear exit node failed", zap.Error(err))
							} else {
								currentExitHostname = nil
							}
						} else {
							logger.Info("activating exit node", zap.String("ip", *newIP))
							if err := setExitNode(*newIP); err != nil {
								logger.Error("tailscale set exit node failed", zap.Error(err))
							} else {
								currentExitHostname = newIP
							}
						}
					}
				}
			}()

		case <-watchdogTicker.C:
			sysd.SdNotify(false, "WATCHDOG=1")
		}
	}
}

// setExitNode calls `tailscale set --exit-node=<ip>`.
// Pass an empty string to clear the exit node.
// --exit-node-allow-lan-access=true ensures the agent can still reach the local
// API server even when all traffic is routed through the exit node.
func setExitNode(ip string) error {
	args := []string{"set", "--exit-node=" + ip}
	if ip != "" {
		args = append(args, "--exit-node-allow-lan-access=true")
	}
	out, err := exec.Command("tailscale", args...).CombinedOutput()
	if err != nil {
		return fmt.Errorf("%s: %w", strings.TrimSpace(string(out)), err)
	}
	return nil
}
