import env from '#start/env'
import { defineConfig } from '@adonisjs/cors'

/*
| Origins are allow-listed rather than reflected.
|
| `origin: true` echoes whatever Origin the caller sends, which combined with
| credentials: true means any website can make credentialled requests to this
| API. Authentication here is a Bearer header the browser does not attach on its
| own, so the practical risk was low — but it is a default that becomes a hole
| the day authentication moves to a cookie, and there is no reason to keep it.
|
| The dashboard's own origin is derived from WEB_PUBLIC_URL. Desktop clients are
| not affected: they are not browsers and send no Origin.
*/
function allowedOrigins(): string[] | boolean {
  const configured = [env.get('WEB_PUBLIC_URL'), env.get('EXTRA_CORS_ORIGINS')]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  // Development: no public URL configured, so keep the permissive behaviour
  // rather than locking someone out of their own localhost.
  if (configured.length === 0) return true

  return [...new Set([...configured, 'http://localhost:3000', 'http://127.0.0.1:3000'])]
}

const corsConfig = defineConfig({
  enabled: true,
  origin: allowedOrigins(),
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
