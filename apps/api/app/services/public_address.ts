import { BlockList, isIP } from 'node:net'

// Addresses that say nothing about where a machine sits on the Internet.
const NOT_PUBLIC = new BlockList()
for (const [net, prefix] of [
  ['10.0.0.0', 8],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['100.64.0.0', 10], // CGNAT — and the mesh's own range
  ['0.0.0.0', 8],
] as const) {
  NOT_PUBLIC.addSubnet(net, prefix, 'ipv4')
}
for (const [net, prefix] of [
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
] as const) {
  NOT_PUBLIC.addSubnet(net, prefix, 'ipv6')
}

/**
 * The address a request came from, if it is a public one.
 *
 * An agent cannot know its own public IP from behind a router — what it
 * reported was its LAN address, shown on the dashboard as "public IP". The
 * API sees the real one on every call (request.ip() through the trusted proxy
 * chain), except when the agent reaches it over a private network, where
 * there is nothing public to record.
 */
export function publicAddress(ip: string | undefined | null): string | null {
  if (!ip) return null
  const addr = ip.replace(/^::ffff:/, '')
  const family = isIP(addr)
  if (family === 0) return null
  return NOT_PUBLIC.check(addr, family === 4 ? 'ipv4' : 'ipv6') ? null : addr
}
