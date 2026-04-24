import vine from '@vinejs/vine'

export const enrollValidator = vine.compile(
  vine.object({
    enrollToken: vine.string().minLength(20).maxLength(200),
    hostname: vine.string().trim().maxLength(255).optional(),
    wireguardPubkey: vine.string().trim().maxLength(500).optional(),
    hardwareModel: vine.string().trim().maxLength(100).optional(),
    osVersion: vine.string().trim().maxLength(100).optional(),
    agentVersion: vine.string().trim().maxLength(20).optional(),
    ipAddress: vine.string().ipAddress().optional(),
    countryCode: vine.string().trim().fixedLength(2).optional(),
    city: vine.string().trim().maxLength(100).optional(),
    latitude: vine.number().range([-90, 90]).optional(),
    longitude: vine.number().range([-180, 180]).optional(),
  })
)

export const heartbeatValidator = vine.compile(
  vine.object({
    agentVersion: vine.string().trim().maxLength(20).optional(),
    wireguardPubkey: vine.string().trim().maxLength(500).optional(),
    ipAddress: vine.string().ipAddress().optional(),
  })
)

export const metricsValidator = vine.compile(
  vine.object({
    samples: vine
      .array(
        vine.object({
          recordedAt: vine.string().optional(),
          bytesSent: vine.number().min(0).optional(),
          bytesReceived: vine.number().min(0).optional(),
          latencyMs: vine.number().min(0).max(65535).optional(),
          cpuPercent: vine.number().min(0).max(100).optional(),
          memoryPercent: vine.number().min(0).max(100).optional(),
          diskPercent: vine.number().min(0).max(100).optional(),
          temperatureCelsius: vine.number().min(-50).max(200).optional(),
          uptimeSeconds: vine.number().min(0).optional(),
          activePeers: vine.number().min(0).max(65535).optional(),
        })
      )
      .minLength(1)
      .maxLength(500),
  })
)

export const peersValidator = vine.compile(
  vine.object({
    peers: vine.array(
      vine.object({
        pubkey: vine.string().maxLength(500),
        name: vine.string().maxLength(100).optional(),
        allowedIps: vine.array(vine.string().maxLength(64)).optional(),
        endpoint: vine.string().maxLength(255).optional(),
        lastHandshakeAt: vine.string().optional(),
        bytesSent: vine.number().min(0).optional(),
        bytesReceived: vine.number().min(0).optional(),
      })
    ),
  })
)
