import { DateTime } from 'luxon'
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
    if (total > 0) {
      console.log(`Demo déjà initialisé (${total} noeuds). Skip.`)
      return
    }

    const metricRows: Record<string, unknown>[] = []

    for (const seed of SEED_NODES) {
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

    console.log(`Seed OK: ${SEED_NODES.length} noeuds + ${metricRows.length} metrics pour demo@umbravpn.io`)
  }
}
