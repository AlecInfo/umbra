package metrics

import (
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"

	"github.com/umbravpn/umbra-agent/internal/api"
)

type Snapshot struct {
	Timestamp          time.Time
	CpuPercent         float64
	CpuCores           int
	LoadAvg            float64
	MemoryPercent      float64
	MemTotalGB         float64
	DiskPercent        float64
	DiskTotalGB        float64
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
	if counts, err := cpu.Counts(true); err == nil {
		snap.CpuCores = counts
	}
	if avg, err := load.Avg(); err == nil {
		snap.LoadAvg = avg.Load1
	}

	if vm, err := mem.VirtualMemory(); err == nil {
		snap.MemoryPercent = vm.UsedPercent
		snap.MemTotalGB = float64(vm.Total) / 1_073_741_824
	}

	if du, err := disk.Usage("/"); err == nil {
		snap.DiskPercent = du.UsedPercent
		snap.DiskTotalGB = float64(du.Total) / 1_073_741_824
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
		CpuCores:           s.CpuCores,
		LoadAvg:            s.LoadAvg,
		MemoryPercent:      s.MemoryPercent,
		MemTotalGB:         s.MemTotalGB,
		DiskPercent:        s.DiskPercent,
		DiskTotalGB:        s.DiskTotalGB,
		TemperatureCelsius: s.TemperatureCelsius,
		UptimeSeconds:      s.UptimeSeconds,
		BytesSent:          s.BytesSent,
		BytesReceived:      s.BytesReceived,
		ActivePeers:        s.ActivePeers,
	}
}
