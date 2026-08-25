import { defineConfig } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

/*
| Which peers may speak for someone else.
|
| AdonisJS trusts `loopback` by default, which is right for a process exposed
| directly and wrong for every deployment we ship: the API sits behind Caddy on
| a Docker bridge network, so the peer address is 172.x — never loopback. The
| default therefore makes request.ip() return Caddy's container address for
| every request on earth. That silently breaks two things: the login/register
| throttles key on the IP, so the whole instance shares one bucket instead of
| one per attacker; and the login log and session list record the proxy instead
| of the visitor, which is the one thing they exist to show.
|
| Only private ranges are trusted, and the walk stops at the first address
| outside them. A client that forges its own X-Forwarded-For does not gain
| anything: Cloudflare appends the real address to the right of whatever it was
| sent, and the rightmost untrusted hop is the one we keep. A request arriving
| directly, with no proxy in front, is judged on its socket address alone.
*/
function trustsPrivateProxies(address: string): boolean {
  const addr = address.replace(/^::ffff:/, '')

  if (addr === '127.0.0.1' || addr === '::1') return true
  if (addr.startsWith('10.') || addr.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return true
  if (addr.startsWith('169.254.')) return true
  // fc00::/7 — unique local, the IPv6 equivalent of the ranges above.
  if (/^f[cd]/i.test(addr)) return true

  return false
}

export const http = defineConfig({
  trustProxy: trustsPrivateProxies,
  generateRequestId: true,
  allowMethodSpoofing: false,
  useAsyncLocalStorage: true,
  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
