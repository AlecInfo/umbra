import vine from '@vinejs/vine'
import type { FieldContext } from '@vinejs/vine/types'
import { DateTime } from 'luxon'

/*
| Timestamps coming from agents used to be validated as plain strings, so a
| malformed one flowed straight into `new Date(...)` and then into SQL as an
| Invalid Date — a 500 rather than a 422. A regex is not enough here: it would
| happily pass 2026-13-45T99:99:99Z, so parse it instead.
*/
const isoDateTimeRule = vine.createRule(
  (value: unknown, _options: undefined, field: FieldContext) => {
    if (typeof value !== 'string') return
    if (!DateTime.fromISO(value).isValid) {
      field.report('The {{ field }} field must be a valid ISO 8601 datetime', 'isoDateTime', field)
    }
  }
)

export const isoDateTime = () => vine.string().use(isoDateTimeRule())
