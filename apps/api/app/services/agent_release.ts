import { readFile } from 'node:fs/promises'

export interface ReleaseManifest {
  version: string
  binaries: Record<string, { sha256: string; signature: string }>
}

const MANIFEST_URL = new URL('../../resources/releases/manifest.json', import.meta.url)

/**
 * The agent release this server distributes, written by build-releases.sh.
 * Null when the deployment ships no binaries — then nothing can be called
 * outdated, because there is nothing to update to.
 */
export async function readReleaseManifest(): Promise<ReleaseManifest | null> {
  try {
    return JSON.parse(await readFile(MANIFEST_URL, 'utf-8'))
  } catch {
    return null
  }
}

/** -1, 0 or 1. Numeric per segment, so 1.10.0 sorts after 1.9.0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((s) => Number.parseInt(s, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((s) => Number.parseInt(s, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return Math.sign(d)
  }
  return 0
}
