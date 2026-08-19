import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'connection_logs'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // The pre-auth key handed to the client at /connect. Headscale reports it
      // back on the node that used it, which is what lets a session be tied to
      // an exact device instead of guessed at.
      table.text('headscale_preauth_key').nullable()

      // Peer counters are cumulative and reset whenever tailscaled restarts, so
      // a session's traffic is accumulated from deltas rather than computed as
      // (current - value at connect time). These hold the last observed values.
      table.bigInteger('last_peer_bytes_sent').nullable()
      table.bigInteger('last_peer_bytes_received').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('headscale_preauth_key')
      table.dropColumn('last_peer_bytes_sent')
      table.dropColumn('last_peer_bytes_received')
    })
  }
}
