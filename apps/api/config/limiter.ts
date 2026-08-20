import { defineConfig, stores } from '@adonisjs/limiter'

/*
| The provider was registered from day one but never configured, so nothing was
| ever throttled: /auth/login accepted unlimited attempts, and /agent/register
| unlimited calls — each one minting a pre-auth key in Headscale.
|
| The memory store keeps counters in the process. That is enough for a
| single-container deployment, which is what docker-compose ships; running
| several API replicas would need the redis or database store instead, since
| each process would otherwise count on its own.
*/
const limiterConfig = defineConfig({
  default: 'memory',
  stores: {
    memory: stores.memory({}),
  },
})

export default limiterConfig

declare module '@adonisjs/limiter/types' {
  export interface LimitersList extends InferLimiters<typeof limiterConfig> {}
}
