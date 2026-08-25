/*
| Inside the packaged apps, nothing works until we know which instance to talk
| to. One build is shipped to everyone and each person runs their own server, so
| the address cannot be baked in — it has to be asked for, once, before any
| screen that would try to fetch something.
|
| This is a no-op on the web, where the dashboard is served by the very
| deployment it queries.
|
| The 01. prefix is load-bearing. Global middleware run in filename order, and
| auth.global would otherwise get there first, see nobody signed in and redirect
| to /login — which aborts the chain, so this never ran and the app silently
| queried the address baked in at build time.
*/
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client) return
  if (!isDesktopApp()) return
  if (to.path === '/server') return

  const stored = localStorage.getItem(SERVER_URL_KEY)?.replace(/^"|"$/g, '')
  if (!stored) return navigateTo('/server')
})
