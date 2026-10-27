// Package remoteconfig applies the settings the server sends back with each
// heartbeat: how often to heartbeat, and whether to update itself.
//
// They used to live only in /etc/umbra/agent.json, which nobody can edit from
// the dashboard — so the dashboard showed both as settings while neither could
// be changed. Now the server is the source and this file a cache of it.
package remoteconfig

import (
	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
)

// Bounds on the heartbeat interval. Below 5 s the agent mostly measures
// itself; above 5 min a dead node goes unnoticed for too long. The server
// enforces the same range — this is the agent not trusting it blindly.
const (
	MinIntervalSeconds = 5
	MaxIntervalSeconds = 300
)

// Changes says what Apply modified, so the caller can act on it (reset the
// heartbeat ticker, wake the updater) and persist the config.
type Changes struct {
	Interval   bool
	AutoUpdate bool
}

func (c Changes) Any() bool { return c.Interval || c.AutoUpdate }

// Apply merges what the server asks for into cfg. A field the server does not
// send is left alone; an interval out of range is ignored rather than clamped,
// since a value the server should never send says something is wrong.
func Apply(cfg *config.Config, remote *api.RemoteConfig) Changes {
	var ch Changes
	if remote == nil {
		return ch
	}
	if v := remote.HeartbeatIntervalSeconds; v != nil &&
		*v >= MinIntervalSeconds && *v <= MaxIntervalSeconds &&
		*v != cfg.HeartbeatIntervalSeconds {
		cfg.HeartbeatIntervalSeconds = *v
		ch.Interval = true
	}
	if v := remote.AutoUpdate; v != nil && *v != cfg.AutoUpdate {
		cfg.AutoUpdate = *v
		ch.AutoUpdate = true
	}
	return ch
}

// Report is what the agent tells the server it is running with.
func Report(cfg *config.Config) *api.AgentConfigReport {
	return &api.AgentConfigReport{
		HeartbeatIntervalSeconds: cfg.HeartbeatIntervalSeconds,
		AutoUpdate:               cfg.AutoUpdate,
	}
}
