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
