import { useAuthStore } from '~/stores/auth'

export function useApi() {
  const config = useRuntimeConfig()
  // On the server side use the internal SSR URL (Docker network), fall back to public URL
  const built = (import.meta.server && config.apiBaseSsr) ? config.apiBaseSsr : config.public.apiBase
  // Inside the packaged apps the address is not known at build time — one build
  // is shipped to everyone and each person points it at their own server.
  const apiBase = currentApiBase(built)
  const auth = useAuthStore()

  return $fetch.create({
    baseURL: apiBase,
    onRequest({ options }) {
      if (auth.token) {
        const headers = new Headers(options.headers)
        headers.set('Authorization', `Bearer ${auth.token}`)
        options.headers = headers
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        auth.token = null
        auth.user = null
      }
    },
  })
}
