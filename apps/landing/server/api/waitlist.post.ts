import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve('/tmp', 'umbra-waitlist')
const dataFile = resolve(dataDir, 'waitlist.json')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface WaitlistEntry {
  email: string
  date: string
  ip: string
}

function readEntries(): WaitlistEntry[] {
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    if (!existsSync(dataFile)) {
      writeFileSync(dataFile, '[]', 'utf-8')
      return []
    }
    const raw = readFileSync(dataFile, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeEntries(entries: WaitlistEntry[]) {
  try {
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true })
    }
    writeFileSync(dataFile, JSON.stringify(entries, null, 2), 'utf-8')
  } catch {
    // silently fail — don't crash the server
  }
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: string }>(event)

  if (!body || !body.email || typeof body.email !== 'string') {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Email is required.' }
  }

  const email = body.email.trim().toLowerCase()

  if (!EMAIL_RE.test(email)) {
    setResponseStatus(event, 400)
    return { ok: false, error: 'Invalid email format.' }
  }

  const entries = readEntries()

  if (entries.some(e => e.email === email)) {
    setResponseStatus(event, 409)
    return { ok: false, error: 'Email already registered.' }
  }

  const ip = getHeader(event, 'x-forwarded-for') || 'unknown'

  entries.push({ email, date: new Date().toISOString(), ip })
  writeEntries(entries)

  return { ok: true }
})
