import { BaseSchema } from '@adonisjs/lucid/schema'

/*
| Hourly rollup of node_metrics, kept current by TimescaleDB itself.
|
| The week, month and year charts read from here. Aggregating raw samples for
| a year took 13 s on the Pi with 558k rows — and the table grows by 8 640 rows
| per node per day. Here a year is 8 760 rows per node, whatever the history.
|
| materialized_only = false: the last hour or two, not yet materialized, is
| aggregated from the raw table on the fly, so the charts never lag behind.
|
| Not transactional: refresh_continuous_aggregate refuses to run inside one.
*/
export default class extends BaseSchema {
  static disableTransactions = true

  async up() {
    this.schema.raw(`
      CREATE MATERIALIZED VIEW node_metrics_hourly
      WITH (timescaledb.continuous, timescaledb.materialized_only = false) AS
      SELECT node_id,
             time_bucket('1 hour', recorded_at)  AS bucket,
             avg(cpu_percent)                    AS cpu_percent,
             avg(memory_percent)                 AS memory_percent,
             avg(disk_percent)                   AS disk_percent,
             avg(temperature_celsius)            AS temperature_celsius,
             avg(latency_ms)                     AS latency_ms,
             max(active_peers)                   AS active_peers,
             last(bytes_sent, recorded_at)       AS bytes_sent,
             last(bytes_received, recorded_at)   AS bytes_received
      FROM node_metrics
      GROUP BY node_id, bucket
      WITH NO DATA
    `)

    this.schema.raw(`
      SELECT add_continuous_aggregate_policy('node_metrics_hourly',
        start_offset      => INTERVAL '3 hours',
        end_offset        => INTERVAL '1 hour',
        schedule_interval => INTERVAL '30 minutes')
    `)

    // Backfill the existing history once. Slow on a large install (it is the
    // 13 s query, run a single time), instant on a new one.
    this.schema.raw(`CALL refresh_continuous_aggregate('node_metrics_hourly', NULL, now() - INTERVAL '1 hour')`)
  }

  async down() {
    this.schema.raw('DROP MATERIALIZED VIEW IF EXISTS node_metrics_hourly')
  }
}
