import env from '#start/env'
import { defineConfig, targets } from '@adonisjs/core/logger'

const loggerConfig = defineConfig({
  default: 'app',
  loggers: {
    app: {
      enabled: true,
      name: 'umbra-api',
      level: env.get('LOG_LEVEL', 'info'),
      transport: {
        targets: targets()
          .pushIf(env.get('NODE_ENV') === 'development', targets.pretty())
          .pushIf(env.get('NODE_ENV') !== 'development', targets.file({ destination: 1 }))
          .toArray(),
      },
    },
  },
})

export default loggerConfig

declare module '@adonisjs/core/types' {
  export interface LoggersList extends InferLoggers<typeof loggerConfig> {}
}
