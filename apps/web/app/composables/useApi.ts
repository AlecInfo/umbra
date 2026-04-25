import { useAuthStore } from '~/stores/auth'

export function useApi() {
  const { public: { apiBase } } = useRuntimeConfig()
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
