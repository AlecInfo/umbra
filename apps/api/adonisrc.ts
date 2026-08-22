import { defineConfig } from '@adonisjs/core/app'

export default defineConfig({
  commands: [
    () => import('@adonisjs/core/commands'),
    () => import('@adonisjs/lucid/commands'),
  ],
  providers: [
    () => import('@adonisjs/core/providers/app_provider'),
    () => import('@adonisjs/core/providers/hash_provider'),
    () => import('@adonisjs/core/providers/repl_provider'),
    () => import('@adonisjs/core/providers/vinejs_provider'),
    () => import('@adonisjs/cors/cors_provider'),
    () => import('@adonisjs/lucid/database_provider'),
    () => import('@adonisjs/auth/auth_provider'),
    () => import('@adonisjs/limiter/limiter_provider'),
    () => import('@adonisjs/mail/mail_provider'),
  ],
  preloads: [
    () => import('#start/routes'),
    {
      file: () => import('#start/kernel'),
      environment: ['web'],
    },
    {
      file: () => import('#start/offline_watch'),
      environment: ['web'],
    },
  ],
  metaFiles: [
    {
      pattern: 'resources/views/**/*.edge',
      reloadServer: false,
    },
  ],
  tests: {
    suites: [
      {
        files: ['tests/functional/**/*.spec.ts'],
        name: 'functional',
        timeout: 30_000,
      },
    ],
    // The pg pool keeps the event loop alive after PASSED without this
    forceExit: true,
  },
})