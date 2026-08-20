import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'
import { loginThrottle, registerThrottle, agentRegisterThrottle } from '#start/limiter'

const AuthController        = () => import('#controllers/auth_controller')
const NodesController       = () => import('#controllers/nodes_controller')
const AgentController       = () => import('#controllers/agent_controller')
const ApiKeysController     = () => import('#controllers/api_keys_controller')
const AlertsController      = () => import('#controllers/alerts_controller')
const ConnectionsController = () => import('#controllers/connections_controller')
const ConnectController     = () => import('#controllers/connect_controller')
const OrgsController        = () => import('#controllers/organizations_controller')

router
  .group(() => {
    router.get('/health', async () => ({ status: 'ok' }))

    router
      .group(() => {
        router.post('/register', [AuthController, 'register']).use(registerThrottle)
        router.post('/login', [AuthController, 'login']).use(loginThrottle)

        router
          .group(() => {
            router.post('/logout', [AuthController, 'logout'])
            router.get('/me', [AuthController, 'me'])
            router.patch('/me', [AuthController, 'updateProfile'])
            router.post('/change-password', [AuthController, 'changePassword'])
            router.get('/sessions', [AuthController, 'sessions'])
            router.delete('/sessions/:id', [AuthController, 'revokeSession'])
            router.get('/login-logs', [AuthController, 'loginLogs'])
            router.delete('/account', [AuthController, 'deleteAccount'])
          })
          .use(middleware.auth())
      })
      .prefix('/auth')

    router
      .group(() => {
        router.get('/nodes', [NodesController, 'index'])
        router.post('/nodes', [NodesController, 'store'])
        router.get('/nodes/:id', [NodesController, 'show'])
        router.patch('/nodes/:id', [NodesController, 'update'])
        router.delete('/nodes/:id', [NodesController, 'destroy'])
        router.get('/nodes/:id/metrics', [NodesController, 'metrics'])
        router.get('/nodes/:id/peers', [NodesController, 'peers'])
        router.post('/nodes/:id/enroll-token', [NodesController, 'enrollToken'])
        router.post('/nodes/:id/transfer', [NodesController, 'transfer'])

        router.get('/api-keys', [ApiKeysController, 'index'])
        router.post('/api-keys', [ApiKeysController, 'store'])
        router.patch('/api-keys/:id/revoke', [ApiKeysController, 'revoke'])
        router.delete('/api-keys/:id', [ApiKeysController, 'destroy'])

        router.get('/alerts', [AlertsController, 'index'])
        router.get('/connections', [ConnectionsController, 'index'])

        router.get('/orgs', [OrgsController, 'index'])
        router.post('/orgs', [OrgsController, 'store'])
        // Before /orgs/:id so "invitations" is not read as an org id.
        router.post('/orgs/invitations/accept', [OrgsController, 'acceptInvitation'])
        router.get('/orgs/:id', [OrgsController, 'show'])
        router.patch('/orgs/:id', [OrgsController, 'update'])
        router.delete('/orgs/:id', [OrgsController, 'destroy'])
        router.get('/orgs/:id/members', [OrgsController, 'members'])
        router.patch('/orgs/:id/members/:userId', [OrgsController, 'updateMember'])
        router.delete('/orgs/:id/members/:userId', [OrgsController, 'removeMember'])
        router.get('/orgs/:id/invitations', [OrgsController, 'invitations'])
        router.post('/orgs/:id/invitations', [OrgsController, 'invite'])
        router.delete('/orgs/:id/invitations/:invitationId', [OrgsController, 'revokeInvitation'])

        router.post('/connect', [ConnectController, 'connect'])
        router.delete('/connect', [ConnectController, 'disconnect'])
      })
      .use(middleware.auth())

    router
      .group(() => {
        // No agent auth — register uses the enroll token, version is public
        router.post('/register', [AgentController, 'register']).use(agentRegisterThrottle)
        router.get('/version', [AgentController, 'version'])

        router
          .group(() => {
            router.post('/heartbeat', [AgentController, 'heartbeat'])
          })
          .use(middleware.agent())
      })
      .prefix('/agent')
  })
  .prefix('/api/v1')
