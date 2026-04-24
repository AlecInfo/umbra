import 'reflect-metadata'
import { Ignitor, prettyPrintError } from '@adonisjs/core'
import { configure, processCLIArgs, run } from '@japa/runner'

process.env.NODE_ENV = 'test'
process.env.PORT = process.env.PORT ?? '3334'
process.env.HOST = process.env.HOST ?? '127.0.0.1'
process.env.TEST_BASE_URL = `http://${process.env.HOST}:${process.env.PORT}`

const APP_ROOT = new URL('../', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, APP_ROOT).href)
  }
  return import(filePath)
}

new Ignitor(APP_ROOT, { importer: IMPORTER })
  .tap((app) => {
    app.listen('SIGTERM', () => app.terminate())
  })
  .testRunner()
  .configure(async (app) => {
    const { runnerHooks, plugins, configureSuite } = await import('../tests/bootstrap.ts')
    processCLIArgs(process.argv.splice(2))
    configure({
      ...app.rcFile.tests,
      plugins,
      setup: runnerHooks.setup,
      teardown: runnerHooks.teardown,
      configureSuite,
    })
  })
  .run(() => run())
  .catch((error) => {
    process.exitCode = 1
    prettyPrintError(error)
  })
