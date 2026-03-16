import type { RouterConfig } from '@nuxt/schema'

export default <RouterConfig>{
  scrollBehavior(to, _from, savedPosition) {
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ el: to.hash, behavior: 'smooth', top: 64 })
        }, 100)
      })
    }
    if (savedPosition) return savedPosition
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ top: 0, left: 0 })
      }, 50)
    })
  }
}
