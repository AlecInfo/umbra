import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'nodes'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('arch', 20).nullable().after('hardware_model')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('arch')
    })
  }
}
