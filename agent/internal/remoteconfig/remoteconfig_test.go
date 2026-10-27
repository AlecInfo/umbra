package remoteconfig

import (
	"testing"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/config"
)

func ptr[T any](v T) *T { return &v }

func TestApplyTakesWhatTheServerAsks(t *testing.T) {
	cfg := &config.Config{HeartbeatIntervalSeconds: 10, AutoUpdate: false}
	ch := Apply(cfg, &api.RemoteConfig{HeartbeatIntervalSeconds: ptr(60), AutoUpdate: ptr(true)})
	if !ch.Interval || !ch.AutoUpdate {
		t.Fatalf("expected both to change, got %+v", ch)
	}
	if cfg.HeartbeatIntervalSeconds != 60 || !cfg.AutoUpdate {
		t.Fatalf("config not updated: %+v", cfg)
	}
}

func TestApplyReportsNoChangeWhenAlreadyThere(t *testing.T) {
	cfg := &config.Config{HeartbeatIntervalSeconds: 30, AutoUpdate: true}
	if ch := Apply(cfg, &api.RemoteConfig{HeartbeatIntervalSeconds: ptr(30), AutoUpdate: ptr(true)}); ch.Any() {
		t.Fatalf("nothing should change, got %+v", ch)
	}
}

func TestApplyIgnoresWhatTheServerDoesNotSay(t *testing.T) {
	cfg := &config.Config{HeartbeatIntervalSeconds: 10, AutoUpdate: true}
	// An older server: no config at all, or only one field.
	if ch := Apply(cfg, nil); ch.Any() {
		t.Fatal("nil config must change nothing")
	}
	ch := Apply(cfg, &api.RemoteConfig{AutoUpdate: ptr(false)})
	if ch.Interval || !ch.AutoUpdate || cfg.HeartbeatIntervalSeconds != 10 {
		t.Fatalf("only auto-update should change: %+v %+v", ch, cfg)
	}
}

func TestApplyRefusesAnIntervalOutOfRange(t *testing.T) {
	for _, v := range []int{0, 1, 4, 301, 86400, -10} {
		cfg := &config.Config{HeartbeatIntervalSeconds: 10}
		if ch := Apply(cfg, &api.RemoteConfig{HeartbeatIntervalSeconds: ptr(v)}); ch.Interval || cfg.HeartbeatIntervalSeconds != 10 {
			t.Fatalf("interval %d should be refused", v)
		}
	}
}
