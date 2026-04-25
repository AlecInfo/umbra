import { useAuthStore } from '~/stores/auth'

const PUBLIC_ROUTES = new Set(['/login', '/register', '/onboarding'])

export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore()

  if (PUBLIC_ROUTES.has(to.path)) {
    if (auth.isAuthenticated && (to.path === '/login' || to.path === '/register')) {
      return navigateTo('/')
    }
    return
  }

  if (!auth.isAuthenticated) {
    return navigateTo('/login')
  }
})
