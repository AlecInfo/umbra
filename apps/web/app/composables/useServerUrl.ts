/*
| Which instance we are talking to.
|
| On the web this is decided at build time: the dashboard is served by the same
| deployment as the API, so NUXT_PUBLIC_API_BASE is baked in and never changes.
|
| The packaged apps cannot work that way. One build is downloaded by everyone,
| and each person points it at their own server — that address is only known
| once someone types it. So it lives in localStorage, and the app asks for it on
| first launch.
|
| The stored value is read only inside the app. A browser keeps using the URL it
| was built with, so nothing a page could write into localStorage can redirect
| the dashboard's API calls somewhere else.
*/

export const SERVER_URL_KEY = 'umbra.server_url'

/** Accepts what someone would actually type, returns an API base or null. */
export function normalizeServerUrl(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (!url.hostname) return null

  // Tolerate the full API base being pasted in, which is what someone copying
  // from their own .env would have to hand.
  const path = url.pathname.replace(/\/+$/, '').replace(/\/api\/v1$/, '')
  return `${url.origin}${path}/api/v1`
}

export function useServerUrl() {
  const config = useRuntimeConfig()
  const stored = useLocalStorage<string>(SERVER_URL_KEY, '')

  const configured = computed(() => Boolean(stored.value) || !isDesktopApp())

  return {
    stored,
    configured,
    apiBase: computed(() => (isDesktopApp() && stored.value) || config.public.apiBase),
    set(input: string): boolean {
      const base = normalizeServerUrl(input)
      if (!base) return false
      stored.value = base
      return true
    },
    clear() {
      stored.value = ''
    },
  }
}

/** Non-reactive read, for callers outside a component (useApi, plugins). */
export function currentApiBase(fallback: string): string {
  if (!import.meta.client || !isDesktopApp()) return fallback
  return localStorage.getItem(SERVER_URL_KEY)?.replace(/^"|"$/g, '') || fallback
}
