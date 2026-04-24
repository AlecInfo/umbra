import { defineConfig, drivers } from '@adonisjs/core/hash'
import type { InferHashers } from '@adonisjs/core/types'

const hashConfig = defineConfig({
  default: 'scrypt',
  list: {
    scrypt: drivers.scrypt({}),
  },
})

export default hashConfig

declare module '@adonisjs/hash/types' {
  interface HashersList extends InferHashers<typeof hashConfig> {}
}
