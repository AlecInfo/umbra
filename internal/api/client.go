package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	BackendURL string
	AuthToken  string
	http       *http.Client
}

func NewClient(backendURL, authToken string) *Client {
	return &Client{
		BackendURL: backendURL,
		AuthToken:  authToken,
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *Client) UpdateToken(newToken string) {
	c.AuthToken = newToken
}

// --- Request/Response types ---

type RegisterRequest struct {
	Token         string `json:"token"`
	Hostname      string `json:"hostname"`
	HardwareModel string `json:"hardware_model,omitempty"`
	Arch          string `json:"arch,omitempty"`
	OsVersion     string `json:"os_version"`
	AgentVersion  string `json:"agent_version"`
	IpAddress     string `json:"ip_address,omitempty"`
}

type RegisterResponse struct {
	NodeID          string `json:"node_id"`
	AuthToken       string `json:"auth_token"`
	HeadscaleAuthKey string `json:"headscale_auth_key"`
	HeadscaleURL    string `json:"headscale_url"`
}

type MetricsPayload struct {
	TailscaleIP        string  `json:"tailscale_ip,omitempty"`
	CpuPercent         float64 `json:"cpu_percent"`
	CpuCores           int     `json:"cpu_cores,omitempty"`
	LoadAvg            float64 `json:"load_avg,omitempty"`
	MemoryPercent      float64 `json:"memory_percent"`
	MemTotalGB         float64 `json:"mem_total_gb,omitempty"`
	DiskPercent        float64 `json:"disk_percent"`
	DiskTotalGB        float64 `json:"disk_total_gb,omitempty"`
	TemperatureCelsius float64 `json:"temperature_celsius,omitempty"`
	UptimeSeconds      int64   `json:"uptime_seconds"`
	BytesSent          uint64  `json:"bytes_sent"`
	BytesReceived      uint64  `json:"bytes_received"`
	LatencyMs          int64   `json:"latency_ms,omitempty"`
	ActivePeers        int     `json:"active_peers"`
}

type PeerPayload struct {
	PublicKey       string `json:"public_key"`
	LastHandshakeAt string `json:"last_handshake_at,omitempty"`
	BytesSent       uint64 `json:"bytes_sent"`
	BytesReceived   uint64 `json:"bytes_received"`
}

type HeartbeatRequest struct {
	NodeID       string         `json:"node_id"`
	Timestamp    string         `json:"timestamp"`
	Metrics      MetricsPayload `json:"metrics"`
	Peers        []PeerPayload  `json:"peers"`
	AgentVersion string         `json:"agent_version"`
}

type HeartbeatResponse struct {
	OK             bool    `json:"ok"`
	PeersUpdated   bool    `json:"peers_updated"`
	NewToken       *string `json:"new_token"`
	ExitNodeId     *string `json:"exit_node_id"`
	ExitNodeIP     *string `json:"exit_node_ip"`     // Tailscale IP (100.64.x.x) — use for tailscale set
	ExitNodeHostname *string `json:"exit_node_hostname"` // kept for reference
}

type VersionResponse struct {
	Version   string `json:"version"`
	URL       string `json:"url"`
	Signature string `json:"signature"` // base64 ed25519 signature of the binary
	Sha256    string `json:"sha256,omitempty"`
}

// --- HTTP helpers ---

func (c *Client) post(path string, body any, out any, enrollToken string) error {
	data, err := json.Marshal(body)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", c.BackendURL+path, bytes.NewReader(data))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if enrollToken != "" {
		req.Header.Set("X-Agent-Token", enrollToken)
	} else if c.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AuthToken)
	}
	return c.do(req, out)
}

func (c *Client) get(path string, out any) error {
	req, err := http.NewRequest("GET", c.BackendURL+path, nil)
	if err != nil {
		return err
	}
	if c.AuthToken != "" {
		req.Header.Set("Authorization", "Bearer "+c.AuthToken)
	}
	return c.do(req, out)
}

func (c *Client) do(req *http.Request, out any) error {
	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}
	if resp.StatusCode >= 400 {
		return fmt.Errorf("server %d: %s", resp.StatusCode, string(body))
	}
	if out != nil {
		return json.Unmarshal(body, out)
	}
	return nil
}

// --- API methods ---

func (c *Client) Register(req RegisterRequest) (*RegisterResponse, error) {
	var resp RegisterResponse
	if err := c.post("/agent/register", req, &resp, req.Token); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) Heartbeat(req HeartbeatRequest) (*HeartbeatResponse, error) {
	var resp HeartbeatResponse
	if err := c.post("/agent/heartbeat", req, &resp, ""); err != nil {
		return nil, err
	}
	return &resp, nil
}

func (c *Client) GetLatestVersion(arch string) (*VersionResponse, error) {
	var resp VersionResponse
	if err := c.get("/agent/version?arch="+arch, &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}

// Ping does an unauthenticated round-trip to the API, used as latency probe.
func (c *Client) Ping() error {
	return c.get("/health", nil)
}

func (c *Client) PostMetricsBatch(snapshots []HeartbeatRequest) error {
	for _, s := range snapshots {
		if _, err := c.Heartbeat(s); err != nil {
			return err
		}
	}
	return nil
}

