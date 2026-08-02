import router from '@adonisjs/core/services/router'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

router.get('/', async () => {
  return { name: 'umbra-api', version: '0.0.1' }
})

// Agent binaries — built by umbra-agent/build-releases.sh into resources/releases/
const RELEASE_FILES = new Set([
  'umbra-agent-linux-amd64',
  'umbra-agent-linux-arm64',
  'umbra-agent-linux-armv7',
])

router.get('/releases/:file', async ({ params, response }) => {
  const file = String(params.file)
  if (!RELEASE_FILES.has(file)) {
    return response.notFound({ message: 'Unknown release file' })
  }
  const filePath = join(__dirname, '../resources/releases', file)
  response.header('Content-Type', 'application/octet-stream')
  return response.download(filePath)
})

// Install script — served at /install.sh with BACKEND_URL baked in
router.get('/install.sh', async ({ response }) => {
  const scriptPath = join(__dirname, '../resources/install.sh')
  const script = await readFile(scriptPath, 'utf-8')
  const backendUrl = (process.env.API_PUBLIC_URL ?? 'http://localhost:3333/api/v1')
    .replace(/\/api\/v1\/?$/, '')
  response.header('Content-Type', 'text/plain; charset=utf-8')
  response.header('Content-Disposition', 'inline; filename="install.sh"')
  return response.ok(script.replace('__BACKEND_URL__', backendUrl))
})

// API v1 routes
import './routes/v1.js'
