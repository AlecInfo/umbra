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
| The dashboard's own origin is derived from WEB_PUBLIC_URL.
|
| The Tauri clients ship the same dashboard inside a webview, and a webview is a
| browser: it sends an Origin, and it is not one any deployment can configure,
| because it belongs to the app rather than to the server. Tauri serves the
| bundled files from tauri://localhost on macOS and iOS and from
| http://tauri.localhost elsewhere, so both are allowed unconditionally. Neither
| can be claimed by a website — no public DNS resolves them — so this grants
| nothing to anyone but a locally installed build.
*/
const TAURI_ORIGINS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]

function allowedOrigins(): string[] | boolean {
  const configured = [env.get('WEB_PUBLIC_URL'), env.get('EXTRA_CORS_ORIGINS')]
    .filter(Boolean)
    .flatMap((value) => value!.split(','))
    .map((value) => value.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  // Development: no public URL configured, so keep the permissive behaviour
  // rather than locking someone out of their own localhost.
  if (configured.length === 0) return true

  return [
    ...new Set([
      ...configured,
      ...TAURI_ORIGINS,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]),
  ]
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
