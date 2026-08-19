package config

import (
	"encoding/json"
	"fmt"
	"os"
)

const ConfigPath = "/etc/umbra/agent.json"

type TailscaleConfig struct {
	HeadscaleURL string `json:"headscale_url"`
	Hostname     string `json:"hostname"`
	Interface    string `json:"interface"` // "tailscale0"
}

type Config struct {
	NodeID                   string          `json:"node_id"`
	NodeName                 string          `json:"node_name"`
	BackendURL               string          `json:"backend_url"`
	AuthToken                string          `json:"auth_token"`
	Tailscale                TailscaleConfig `json:"tailscale"`
	HeartbeatIntervalSeconds int             `json:"heartbeat_interval_seconds"`
	AutoUpdate               bool            `json:"auto_update"`
	LogLevel                 string          `json:"log_level"`
	IsLocalClient            bool            `json:"is_local_client"`
}

func Load() (*Config, error) {
	data, err := os.ReadFile(ConfigPath)
	if err != nil {
		return nil, fmt.Errorf("config not found at %s: %w", ConfigPath, err)
	}
	var cfg Config
	if err := json.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}
	if cfg.HeartbeatIntervalSeconds == 0 {
		cfg.HeartbeatIntervalSeconds = 10
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "info"
	}
	if cfg.Tailscale.Interface == "" {
		cfg.Tailscale.Interface = "tailscale0"
	}
	return &cfg, nil
}

func Write(cfg *Config) error {
	if err := os.MkdirAll("/etc/umbra", 0755); err != nil {
		return err
	}
	data, err := json.MarshalIndent(cfg, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(ConfigPath, data, 0600)
}
