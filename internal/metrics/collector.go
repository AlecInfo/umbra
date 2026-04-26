package metrics

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"

	"github.com/umbravpn/umbra-agent/internal/api"
)

type Snapshot struct {
	Timestamp          time.Time
	CpuPercent         float64
	MemoryPercent      float64
	DiskPercent        float64
	TemperatureCelsius float64
	UptimeSeconds      int64
	BytesSent          uint64
	BytesReceived      uint64
	ActivePeers        int
}

func Collect(iface string) (*Snapshot, error) {
	snap := &Snapshot{Timestamp: time.Now()}

	if pcts, err := cpu.Percent(500*time.Millisecond, false); err == nil && len(pcts) > 0 {
		snap.CpuPercent = pcts[0]
	}

	if vm, err := mem.VirtualMemory(); err == nil {
		snap.MemoryPercent = vm.UsedPercent
	}

	if du, err := disk.Usage("/"); err == nil {
		snap.DiskPercent = du.UsedPercent
	}

	// Temperature is nil on most VPS — treat as optional
	if temps, err := host.SensorsTemperatures(); err == nil && len(temps) > 0 {
		snap.TemperatureCelsius = temps[0].Temperature
	}

	if uptime, err := host.Uptime(); err == nil {
		snap.UptimeSeconds = int64(uptime)
	}

	if ns, err := GetNetworkStats(iface); err == nil {
		snap.BytesSent = ns.BytesSent
		snap.BytesReceived = ns.BytesReceived
	}

	snap.ActivePeers = CountActivePeers(iface)

	return snap, nil
}

func (s *Snapshot) ToPayload() api.MetricsPayload {
	return api.MetricsPayload{
		CpuPercent:         s.CpuPercent,
		MemoryPercent:      s.MemoryPercent,
		DiskPercent:        s.DiskPercent,
		TemperatureCelsius: s.TemperatureCelsius,
		UptimeSeconds:      s.UptimeSeconds,
		BytesSent:          s.BytesSent,
		BytesReceived:      s.BytesReceived,
		ActivePeers:        s.ActivePeers,
	}
}
