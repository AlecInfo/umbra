import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'node_metrics'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.integer('cpu_cores').nullable()
      table.float('load_avg').nullable()
      table.float('mem_total_gb').nullable()
      table.float('disk_total_gb').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumns('cpu_cores', 'load_avg', 'mem_total_gb', 'disk_total_gb')
    })
  }
}
