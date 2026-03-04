// Redirect mobile users to /mobile and desktop users away from /mobile.
// Runs client-side only — screen size is not available during SSR.
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return

  const authRoutes = ['/login', '/register', '/onboarding']
  if (authRoutes.includes(to.path)) return

  const isMobile = window.innerWidth <= 768
  const mobileRoutes = ['/mobile', '/mobile-settings']

  if (isMobile && !mobileRoutes.includes(to.path)) {
    return navigateTo('/mobile')
  }
  if (!isMobile && mobileRoutes.includes(to.path)) {
    return navigateTo('/')
  }
})
