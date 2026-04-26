import { DateTime } from 'luxon'
import { createHash, randomBytes } from 'node:crypto'
import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'
import Node from '#models/node'
import NodeMetric from '#models/node_metric'
import db from '@adonisjs/lucid/services/db'

type SeedStatus = 'online' | 'offline' | 'warning' | 'pending'
type SeedCategory = 'sbc' | 'vps' | 'router' | 'nas' | 'desktop' | 'other'

interface SeedNode {
  name: string
  ip: string
  city: string
  country: string
  lat: number
  lng: number
  status: SeedStatus
  category: SeedCategory
  latency: number | null
  cpu: number | null
  ram: number | null
  disk: number | null
  temp: number | null
  uptime: number | null
  lastSeen: string | null
}

const SEED_NODES: SeedNode[] = [
  { name: 'raspi-home', ip: '100.64.0.1', city: 'Genève', country: 'CH', lat: 46.2044, lng: 6.1432, status: 'online', category: 'sbc', latency: 3, cpu: 28, ram: 52, disk: 61, temp: 47, uptime: 2_160_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'synology-home', ip: '100.64.0.2', city: 'Genève', country: 'CH', lat: 46.2052, lng: 6.1445, status: 'online', category: 'nas', latency: 2, cpu: 14, ram: 73, disk: 81, temp: 43, uptime: 5_184_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'gl-inet-bureau', ip: '100.64.0.3', city: 'Genève', country: 'CH', lat: 46.1983, lng: 6.1566, status: 'online', category: 'router', latency: 5, cpu: 6, ram: 18, disk: 8, temp: 38, uptime: 1_296_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'macbook-alec', ip: '100.64.0.4', city: 'Genève', country: 'CH', lat: 46.2031, lng: 6.1418, status: 'offline', category: 'desktop', latency: null, cpu: null, ram: null, disk: null, temp: null, uptime: null, lastSeen: '2026-03-01T14:22:00.000Z' },
  { name: 'raspi-lausanne', ip: '100.64.0.5', city: 'Lausanne', country: 'CH', lat: 46.5197, lng: 6.6323, status: 'online', category: 'sbc', latency: 4, cpu: 19, ram: 44, disk: 38, temp: 44, uptime: 950_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'nano-annecy', ip: '100.64.0.6', city: 'Annecy', country: 'FR', lat: 45.8992, lng: 6.1294, status: 'warning', category: 'sbc', latency: 9, cpu: 82, ram: 77, disk: 91, temp: 71, uptime: 172_800, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'server-zurich', ip: '100.64.0.7', city: 'Zurich', country: 'CH', lat: 47.3769, lng: 8.5417, status: 'online', category: 'other', latency: 7, cpu: 31, ram: 61, disk: 52, temp: 51, uptime: 3_240_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-fra-01', ip: '100.64.0.8', city: 'Frankfurt', country: 'DE', lat: 50.1109, lng: 8.6821, status: 'online', category: 'vps', latency: 14, cpu: 8, ram: 31, disk: 19, temp: null, uptime: 7_776_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-lon-01', ip: '100.64.0.10', city: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, status: 'online', category: 'vps', latency: 18, cpu: 22, ram: 38, disk: 27, temp: null, uptime: 4_320_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-nyc-01', ip: '100.64.0.12', city: 'New York', country: 'US', lat: 40.7128, lng: -74.006, status: 'online', category: 'vps', latency: 98, cpu: 19, ram: 41, disk: 55, temp: null, uptime: 2_592_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-sao-01', ip: '100.64.0.13', city: 'São Paulo', country: 'BR', lat: -23.5505, lng: -46.6333, status: 'online', category: 'vps', latency: 182, cpu: 41, ram: 59, disk: 33, temp: null, uptime: 2_160_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-sgp-01', ip: '100.64.0.14', city: 'Singapore', country: 'SG', lat: 1.3521, lng: 103.8198, status: 'warning', category: 'vps', latency: 201, cpu: 11, ram: 28, disk: 44, temp: null, uptime: 864_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-tok-01', ip: '100.64.0.15', city: 'Tokyo', country: 'JP', lat: 35.6762, lng: 139.6503, status: 'offline', category: 'vps', latency: 241, cpu: 7, ram: 22, disk: 16, temp: null, uptime: 1_728_000, lastSeen: '2026-03-01T18:00:00.000Z' },
  { name: 'vps-syd-01', ip: '100.64.0.16', city: 'Sydney', country: 'AU', lat: -33.8688, lng: 151.2093, status: 'pending', category: 'vps', latency: null, cpu: null, ram: null, disk: null, temp: null, uptime: null, lastSeen: '2026-03-01T17:58:00.000Z' },
]

const HARDWARE: Record<SeedCategory, string> = {
  sbc: 'Raspberry Pi 4 (8 GB)',
  nas: 'Synology DS920+',
  router: 'GL.iNet MT3000',
  desktop: 'MacBook Pro M2',
  vps: 'Hetzner CX21',
  other: 'Generic x86_64',
}

const OS_VERSION: Record<SeedCategory, string> = {
  sbc: 'Debian 12 (bookworm)',
  nas: 'DSM 7.2',
  router: 'OpenWrt 23.05',
  desktop: 'macOS 14.3',
  vps: 'Ubuntu 22.04 LTS',
  other: 'Linux 6.1',
}

export default class MainSeeder extends BaseSeeder {
  static environment = ['development', 'testing']

  async run() {
    const demo = await User.firstOrCreate(
      { email: 'demo@umbravpn.io' },
      {
        email: 'demo@umbravpn.io',
        passwordHash: 'demodemo123',
        name: 'Demo User',
        isActive: true,
        emailVerified: true,
      }
    )

    const existing = await Node.query().where('owner_user_id', demo.id).count('* as total')
    const total = Number(existing[0].$extras.total)

    const metricRows: Record<string, unknown>[] = []

    if (total > 0) {
      console.log(`Noeuds déjà présents (${total}). Skip nodes+metrics.`)
    } else for (const seed of SEED_NODES) {
      const status: 'pending' | 'online' | 'warning' | 'offline' =
        seed.status === 'pending' ? 'pending' : seed.status
      const lastSeen = seed.lastSeen ? DateTime.fromISO(seed.lastSeen) : null

      const node = await Node.create({
        ownerUserId: demo.id,
        ownerOrgId: null,
        name: seed.name,
        hostname: seed.name,
        ipAddress: null,
        wireguardIp: seed.ip,
        wireguardPubkey: null,
        supportsWireguard: true,
        supportsOpenvpn: false,
        wireguardPort: 51820,
        openvpnPort: null,
        status,
        lastSeenAt: lastSeen,
        category: seed.category,
        countryCode: seed.country,
        city: seed.city,
        latitude: seed.lat,
        longitude: seed.lng,
        hardwareModel: HARDWARE[seed.category],
        osVersion: OS_VERSION[seed.category],
        agentVersion: '1.0.0',
      })

      if (seed.cpu !== null) {
        metricRows.push({
          node_id: node.id,
          recorded_at: (lastSeen ?? DateTime.now()).toJSDate(),
          bytes_sent: Math.round(Math.random() * 10_000_000),
          bytes_received: Math.round(Math.random() * 10_000_000),
          latency_ms: seed.latency,
          cpu_percent: seed.cpu,
          memory_percent: seed.ram,
          disk_percent: seed.disk,
          temperature_celsius: seed.temp,
          uptime_seconds: seed.uptime,
          active_peers: Math.floor(Math.random() * 5),
        })
      }
    }

    if (metricRows.length > 0) {
      await db.table('node_metrics').multiInsert(metricRows)
    }

    if (metricRows.length > 0 || total === 0) {
      console.log(`Seed OK: ${SEED_NODES.length} noeuds + ${metricRows.length} metrics pour demo@umbravpn.io`)
    }

    // ── API Keys ────────────────────────────────────────────────────────────
    const existingKeys = await db.from('api_keys').where('user_id', demo.id).count('* as total').first()
    if (Number(existingKeys?.total ?? 0) === 0) {
      function demoKey(raw: string) {
        return { prefix: raw.slice(0, 8), hash: createHash('sha256').update(raw).digest('hex') }
      }
      const k1 = demoKey(randomBytes(24).toString('hex'))
      const k2 = demoKey(randomBytes(24).toString('hex'))
      const k3 = demoKey(randomBytes(24).toString('hex'))
      await db.table('api_keys').multiInsert([
        { user_id: demo.id, name: 'Script backup',  key_hash: k1.hash, key_prefix: k1.prefix, scopes: '{read}',                       created_at: DateTime.now().minus({ days: 45 }).toJSDate(), last_used_at: DateTime.now().minus({ days: 7 }).toJSDate()  },
        { user_id: demo.id, name: 'CI/CD pipeline', key_hash: k2.hash, key_prefix: k2.prefix, scopes: '{read,write,nodes,alerts}',     created_at: DateTime.now().minus({ days: 60 }).toJSDate(), last_used_at: DateTime.now().minus({ hours: 6 }).toJSDate(), expires_at: DateTime.now().plus({ days: 30 }).toJSDate() },
        { user_id: demo.id, name: 'Test local',     key_hash: k3.hash, key_prefix: k3.prefix, scopes: '{read}',                       created_at: DateTime.now().minus({ days: 90 }).toJSDate(), revoked_at:  DateTime.now().minus({ days: 10 }).toJSDate()  },
      ])
      console.log('Seed OK: 3 api_keys')
    }

    // ── Node Alerts ─────────────────────────────────────────────────────────
    const nodeRows = await db.from('nodes').where('owner_user_id', demo.id).whereNull('deleted_at').select('id', 'name')
    const nid: Record<string, string> = {}
    for (const n of nodeRows) nid[n.name] = n.id

    const existingAlerts = await db.from('node_alerts').whereIn('node_id', Object.values(nid)).count('* as total').first()
    if (Number(existingAlerts?.total ?? 0) === 0 && nid['nano-annecy'] && nid['vps-sgp-01'] && nid['vps-tok-01']) {
      const now = DateTime.now()
      await db.table('node_alerts').multiInsert([
        { node_id: nid['vps-tok-01'],   created_by: demo.id, type: 'node_offline',      threshold_value: null, threshold_unit: null, is_active: true,  triggered_at: now.minus({ hours: 6 }).toJSDate(),  resolved_at: null,                               notify_email: true, created_at: now.minus({ hours: 6 }).toJSDate(),  updated_at: now.minus({ hours: 6 }).toJSDate()  },
        { node_id: nid['nano-annecy'],  created_by: demo.id, type: 'cpu_high',          threshold_value: 80,   threshold_unit: '%',  is_active: true,  triggered_at: now.minus({ hours: 2 }).toJSDate(),  resolved_at: null,                               notify_email: true, created_at: now.minus({ hours: 2 }).toJSDate(),  updated_at: now.minus({ hours: 2 }).toJSDate()  },
        { node_id: nid['nano-annecy'],  created_by: demo.id, type: 'temperature_high',  threshold_value: 70,   threshold_unit: '°C', is_active: true,  triggered_at: now.minus({ hours: 2 }).toJSDate(),  resolved_at: null,                               notify_email: true, created_at: now.minus({ hours: 2 }).toJSDate(),  updated_at: now.minus({ hours: 2 }).toJSDate()  },
        { node_id: nid['nano-annecy'],  created_by: demo.id, type: 'disk_high',         threshold_value: 90,   threshold_unit: '%',  is_active: true,  triggered_at: now.minus({ hours: 1 }).toJSDate(),  resolved_at: null,                               notify_email: true, created_at: now.minus({ hours: 1 }).toJSDate(),  updated_at: now.minus({ hours: 1 }).toJSDate()  },
        { node_id: nid['vps-sgp-01'],   created_by: demo.id, type: 'latency_high',      threshold_value: 200,  threshold_unit: 'ms', is_active: true,  triggered_at: now.minus({ hours: 3 }).toJSDate(),  resolved_at: null,                               notify_email: true, created_at: now.minus({ hours: 3 }).toJSDate(),  updated_at: now.minus({ hours: 3 }).toJSDate()  },
        { node_id: nid['vps-sgp-01'],   created_by: demo.id, type: 'memory_high',       threshold_value: 85,   threshold_unit: '%',  is_active: false, triggered_at: now.minus({ days: 1 }).toJSDate(),   resolved_at: now.minus({ hours: 20 }).toJSDate(), notify_email: true, created_at: now.minus({ days: 1 }).toJSDate(),   updated_at: now.minus({ hours: 20 }).toJSDate() },
        { node_id: nid['raspi-home'],   created_by: demo.id, type: 'peer_disconnected', threshold_value: null, threshold_unit: null, is_active: false, triggered_at: now.minus({ days: 2 }).toJSDate(),   resolved_at: now.minus({ days: 1 }).toJSDate(),  notify_email: true, created_at: now.minus({ days: 2 }).toJSDate(),   updated_at: now.minus({ days: 1 }).toJSDate()   },
      ])
      console.log('Seed OK: 7 node_alerts')
    }

    // ── Connection Logs ─────────────────────────────────────────────────────
    const existingConns = await db.from('connection_logs').where('user_id', demo.id).count('* as total').first()
    if (Number(existingConns?.total ?? 0) === 0 && nid['raspi-home'] && nid['vps-lon-01'] && nid['vps-fra-01'] && nid['vps-nyc-01']) {
      const now = DateTime.now()
      await db.table('connection_logs').multiInsert([
        { user_id: demo.id, node_id: nid['raspi-home'],  device_id: null, connected_at: now.minus({ hours: 4 }).toJSDate(),  disconnected_at: null,                                  bytes_sent: 1_258_291,  bytes_received: 5_033_164,   client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['vps-lon-01'],  device_id: null, connected_at: now.minus({ hours: 10 }).toJSDate(), disconnected_at: now.minus({ hours: 8, minutes: 46 }).toJSDate(),  bytes_sent: 251_658_240, bytes_received: 1_288_490_188, client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['vps-fra-01'],  device_id: null, connected_at: now.minus({ hours: 14 }).toJSDate(), disconnected_at: now.minus({ hours: 10, minutes: 15 }).toJSDate(), bytes_sent: 92_274_688,  bytes_received: 440_401_920,  client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['raspi-home'],  device_id: null, connected_at: now.minus({ days: 1, hours: 2 }).toJSDate(), disconnected_at: now.minus({ hours: 20 }).toJSDate(), bytes_sent: 587_202_560, bytes_received: 2_936_012_800, client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['vps-nyc-01'],  device_id: null, connected_at: now.minus({ days: 1, hours: 6 }).toJSDate(), disconnected_at: now.minus({ days: 1, hours: 4, minutes: 28 }).toJSDate(), bytes_sent: 18_874_368, bytes_received: 99_614_720, client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['vps-lon-01'],  device_id: null, connected_at: now.minus({ days: 2, hours: 1 }).toJSDate(), disconnected_at: now.minus({ days: 1, hours: 21, minutes: 38 }).toJSDate(), bytes_sent: 1_153_433_600, bytes_received: 4_403_699_712, client_ip: '82.120.44.16', protocol: 'wireguard' },
        { user_id: demo.id, node_id: nid['raspi-home'],  device_id: null, connected_at: now.minus({ days: 2, hours: 18 }).toJSDate(), disconnected_at: now.minus({ days: 2, hours: 17, minutes: 2 }).toJSDate(), bytes_sent: 125_829_120, bytes_received: 713_031_680, client_ip: '82.120.44.16', protocol: 'wireguard' },
      ])
      console.log('Seed OK: 7 connection_logs')
    }

    // ── Audit Logs (auth events) ────────────────────────────────────────────
    const existingAudit = await db.from('audit_logs').where('performed_by', demo.id).where('resource_type', 'auth').count('* as total').first()
    if (Number(existingAudit?.total ?? 0) === 0) {
      const now     = DateTime.now()
      const chrome  = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      const firefox = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0'
      await db.table('audit_logs').multiInsert([
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'login',  ip_address: '82.120.44.16',   user_agent: chrome,  created_at: now.minus({ hours: 4 }).toJSDate() },
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'logout', ip_address: '82.120.44.16',   user_agent: chrome,  created_at: now.minus({ hours: 2 }).toJSDate() },
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'login',  ip_address: '82.120.44.16',   user_agent: chrome,  created_at: now.minus({ days: 1, hours: 3 }).toJSDate() },
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'logout', ip_address: '82.120.44.16',   user_agent: chrome,  created_at: now.minus({ days: 1, hours: 1 }).toJSDate() },
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'login',  ip_address: '91.121.155.22',  user_agent: firefox, created_at: now.minus({ days: 2, hours: 7 }).toJSDate() },
        { performed_by: demo.id, org_id: null, resource_type: 'auth', resource_id: demo.id, action: 'logout', ip_address: '91.121.155.22',  user_agent: firefox, created_at: now.minus({ days: 2, hours: 5 }).toJSDate() },
      ])
      console.log('Seed OK: 6 audit_logs (auth)')
    }
  }
}
