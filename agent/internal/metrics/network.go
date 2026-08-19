package metrics

import psnet "github.com/shirou/gopsutil/v3/net"

type NetStats struct {
	BytesSent     uint64
	BytesReceived uint64
}

func GetNetworkStats(iface string) (*NetStats, error) {
	counters, err := psnet.IOCounters(true)
	if err != nil {
		return nil, err
	}
	for _, c := range counters {
		if c.Name == iface {
			return &NetStats{
				BytesSent:     c.BytesSent,
				BytesReceived: c.BytesRecv,
			}, nil
		}
	}
	// Fallback: aggregate all non-loopback interfaces
	var total NetStats
	for _, c := range counters {
		if c.Name != "lo" {
			total.BytesSent += c.BytesSent
			total.BytesReceived += c.BytesRecv
		}
	}
	return &total, nil
}
