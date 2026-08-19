import { assert } from '@japa/assert'
import app from '@adonisjs/core/services/app'
import testUtils from '@adonisjs/core/services/test_utils'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import { apiClient } from '@japa/api-client'
import { resetDatabase } from '#tests/helpers'

export const plugins: Config['plugins'] = [
  assert(),
  apiClient({ baseURL: process.env.TEST_BASE_URL }),
  pluginAdonisJS(app),
]

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  // migrate() first: the suite runs against its own database (DB_DATABASE in
  // .env.test), so a freshly created, empty one is enough to get going.
  setup: [() => testUtils.db().migrate(), () => testUtils.httpServer().start()],
  teardown: [],
}

export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    suite.setup(() => resetDatabase())
    suite.onGroup((group) => {
      group.each.setup(() => resetDatabase())
    })
  }
}
