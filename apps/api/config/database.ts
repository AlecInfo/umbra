import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'postgres',
  connections: {
    postgres: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST', 'localhost'),
        port: env.get('DB_PORT', 5432),
        user: env.get('DB_USER', 'umbra'),
        password: env.get('DB_PASSWORD', 'umbra'),
        database: env.get('DB_DATABASE', 'umbra'),
      },
      // min: 0 so idle connections are reaped instead of kept. Knex defaults
      // to holding two open, and on a machine that suspends — a laptop hosting
      // the dev instance — those come back as dead sockets the pool cannot tell
      // from live ones, and every query then fails with "timeout acquiring a
      // connection" until the process is restarted.
      pool: { min: 0, max: 10 },

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      seeders: {
        paths: ['database/seeders'],
      },
    },
  },
})

export default dbConfig
