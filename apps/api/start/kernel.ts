import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.use([
  () => import('@adonisjs/cors/cors_middleware'),
])

router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

export const middleware = router.named({
  auth: () => import('#middleware/auth'),
  silentAuth: () => import('#middleware/silent_auth'),
  agent: () => import('#middleware/agent_auth_middleware'),
  operator: () => import('#middleware/operator_middleware'),
})
