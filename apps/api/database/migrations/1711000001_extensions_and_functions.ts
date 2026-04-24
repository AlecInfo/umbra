import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Extensions
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')
    this.schema.raw('CREATE EXTENSION IF NOT EXISTS "timescaledb"')

    // UUIDv7 generator — time-sortable, index-friendly
    this.schema.raw(`
      CREATE OR REPLACE FUNCTION uuid_generate_v7()
      RETURNS UUID AS $$
      DECLARE
          v_time  NUMERIC;
          v_secs  NUMERIC;
          v_msec  NUMERIC;
          v_usec  NUMERIC;
          v_block VARCHAR;
      BEGIN
          v_time := EXTRACT(EPOCH FROM clock_timestamp());
          v_secs := TRUNC(v_time);
          v_msec := TRUNC((v_time - v_secs) * 1000);
          v_usec := TRUNC((v_time - v_secs - v_msec / 1000.0) * 1000000);
          v_block := LPAD(TO_HEX(TRUNC(v_secs * 1000 + v_msec)::BIGINT), 12, '0')
                  || '7'
                  || LPAD(TO_HEX(v_usec::INT), 3, '0')
                  || LPAD(TO_HEX(TRUNC(RANDOM() * 65536)::INT), 4, '0')
                  || LPAD(TO_HEX(TRUNC(RANDOM() * 65536)::INT), 4, '0')
                  || LPAD(TO_HEX(TRUNC(RANDOM() * 281474976710656)::BIGINT), 12, '0');
          RETURN (
              SUBSTRING(v_block, 1,  8) || '-' ||
              SUBSTRING(v_block, 9,  4) || '-' ||
              SUBSTRING(v_block, 13, 4) || '-' ||
              SUBSTRING(v_block, 17, 4) || '-' ||
              SUBSTRING(v_block, 21, 12)
          )::UUID;
      END;
      $$ LANGUAGE plpgsql
    `)

    // Trigger function for updated_at
    this.schema.raw(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `)
  }

  async down() {
    this.schema.raw('DROP FUNCTION IF EXISTS set_updated_at() CASCADE')
    this.schema.raw('DROP FUNCTION IF EXISTS uuid_generate_v7() CASCADE')
  }
}