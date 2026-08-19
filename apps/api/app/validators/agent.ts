import vine from '@vinejs/vine'

// Used by POST /api/v1/agent/register (Go agent spec)
export const registerValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(20).maxLength(200),
    wireguard_pubkey: vine.string().trim().maxLength(500).optional(),
    hostname: vine.string().trim().maxLength(255).optional(),
    hardware_model: vine.string().trim().maxLength(200).optional(),
    arch: vine.string().trim().maxLength(20).optional(),
    os_version: vine.string().trim().maxLength(100).optional(),
    agent_version: vine.string().trim().maxLength(20).optional(),
    ip_address: vine.string().ipAddress().optional(),
    supports_openvpn: vine.boolean().optional(),
  })
)

// Go agent heartbeat: includes metrics + peers inline
export const heartbeatValidator = vine.compile(
  vine.object({
    node_id: vine.string().optional(),
    timestamp: vine.string().optional(),
    agent_version: vine.string().trim().maxLength(20).optional(),
    metrics: vine
      .object({
        tailscale_ip: vine.string().maxLength(45).optional(),
        cpu_percent: vine.number().min(0).max(100).optional(),
        cpu_cores: vine.number().min(0).max(1024).optional(),
        load_avg: vine.number().min(0).optional(),
        memory_percent: vine.number().min(0).max(100).optional(),
        mem_total_gb: vine.number().min(0).optional(),
        disk_percent: vine.number().min(0).max(100).optional(),
        disk_total_gb: vine.number().min(0).optional(),
        temperature_celsius: vine.number().min(-50).max(200).optional(),
        uptime_seconds: vine.number().min(0).optional(),
        bytes_sent: vine.number().min(0).optional(),
        bytes_received: vine.number().min(0).optional(),
        latency_ms: vine.number().min(0).max(65535).optional(),
        active_peers: vine.number().min(0).max(65535).optional(),
      })
      .optional(),
    peers: vine
      .array(
        vine.object({
          public_key: vine.string().maxLength(500),
          // peer_name is varchar(100) in the schema; the controller truncates
          // rather than rejecting a heartbeat over a long hostname.
          name: vine.string().maxLength(255).optional(),
          allowed_ips: vine.array(vine.string().maxLength(64)).optional(),
          endpoint: vine.string().maxLength(255).optional(),
          last_handshake_at: vine.string().optional(),
          bytes_sent: vine.number().min(0).optional(),
          bytes_received: vine.number().min(0).optional(),
        })
      )
      .optional(),
  })
)

