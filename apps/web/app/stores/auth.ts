import { defineStore } from 'pinia'

export interface ApiUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  emailVerified: boolean
}

interface AuthResponse {
  user: ApiUser
  token: { type: string; value: string; expiresAt: string | null }
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie<string | null>('umbra-auth-token', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })
  const user = ref<ApiUser | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function apiBase() {
    return useRuntimeConfig().public.apiBase
  }

  async function login(email: string, password: string) {
    const res = await $fetch<AuthResponse>(`${apiBase()}/auth/login`, {
      method: 'POST',
      body: { email, password },
    })
    token.value = res.token.value
    user.value = res.user
  }

  async function register(email: string, password: string, name?: string) {
    const res = await $fetch<AuthResponse>(`${apiBase()}/auth/register`, {
      method: 'POST',
      body: { email, password, name },
    })
    token.value = res.token.value
    user.value = res.user
  }

  async function logout() {
    if (token.value) {
      try {
        await $fetch(`${apiBase()}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token.value}` },
        })
      } catch { /* ignore */ }
    }
    token.value = null
    user.value = null
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await $fetch<{ user: ApiUser }>(`${apiBase()}/auth/me`, {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      user.value = res.user
    } catch {
      token.value = null
      user.value = null
    }
  }

  return { token, user, isAuthenticated, login, register, logout, fetchMe }
})
