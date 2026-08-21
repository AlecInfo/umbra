import { defineStore } from 'pinia'

export interface ApiUser {
  id: string
  email: string
  name: string | null
  avatarUrl: string | null
  emailVerified: boolean
  // Who runs this deployment. Grants no access to anyone's nodes — it only
  // unlocks the instance administration section.
  instanceRole: 'user' | 'operator'
}

interface AuthResponse {
  user: ApiUser
  mustChangePassword?: boolean
  token: { type: string; value: string; expiresAt: string | null }
}

export const useAuthStore = defineStore('auth', () => {
  const token = useCookie<string | null>('umbra-auth-token', {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
  })
  const user = ref<ApiUser | null>(null)
  // Set on accounts provisioned with a temporary password: the dashboard
  // blocks on a change-password modal until it clears.
  const mustChangePassword = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isOperator = computed(() => user.value?.instanceRole === 'operator')

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
    mustChangePassword.value = res.mustChangePassword ?? false
  }

  async function register(email: string, password: string, name?: string) {
    const res = await $fetch<AuthResponse>(`${apiBase()}/auth/register`, {
      method: 'POST',
      body: { email, password, name },
    })
    token.value = res.token.value
    user.value = res.user
    mustChangePassword.value = false
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
    mustChangePassword.value = false
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await $fetch<{ user: ApiUser; mustChangePassword?: boolean }>(
        `${apiBase()}/auth/me`,
        { headers: { Authorization: `Bearer ${token.value}` } }
      )
      user.value = res.user
      mustChangePassword.value = res.mustChangePassword ?? false
    } catch {
      token.value = null
      user.value = null
    }
  }

  return { token, user, mustChangePassword, isAuthenticated, isOperator, login, register, logout, fetchMe }
})
