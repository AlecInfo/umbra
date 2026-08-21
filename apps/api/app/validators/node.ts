import vine from '@vinejs/vine'

const category = vine.enum(['sbc', 'vps', 'router', 'nas', 'desktop', 'other'] as const)
const status = vine.enum(['pending', 'online', 'warning', 'offline', 'error'] as const)

export const createNodeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
    category: category.optional(),
    hostname: vine.string().trim().maxLength(255).optional(),
    countryCode: vine.string().trim().fixedLength(2).optional(),
    city: vine.string().trim().maxLength(100).optional(),
    latitude: vine.number().range([-90, 90]).optional(),
    longitude: vine.number().range([-180, 180]).optional(),
    hardwareModel: vine.string().trim().maxLength(100).optional(),
    osVersion: vine.string().trim().maxLength(100).optional(),
    // Not vine's .uuid(): it only accepts v1-5 and the DB generates UUIDv7
    orgId: vine.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
  })
)

export const updateNodeValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    category: category.optional(),
    status: status.optional(),
    hostname: vine.string().trim().maxLength(255).nullable().optional(),
    countryCode: vine.string().trim().fixedLength(2).nullable().optional(),
    city: vine.string().trim().maxLength(100).nullable().optional(),
    latitude: vine.number().range([-90, 90]).nullable().optional(),
    longitude: vine.number().range([-180, 180]).nullable().optional(),
    hardwareModel: vine.string().trim().maxLength(100).nullable().optional(),
    osVersion: vine.string().trim().maxLength(100).nullable().optional(),
  })
)

export const listNodesValidator = vine.compile(
  vine.object({
    // Not vine's .uuid(): it only accepts v1-5 and the DB generates UUIDv7
    orgId: vine.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),
    status: status.optional(),
    category: category.optional(),
    page: vine.number().positive().optional(),
    perPage: vine.number().range([1, 200]).optional(),
  })
)

// Moving a node between owners: to an organisation, to another account, or
// back to the caller. Exactly one target, or none for "back to me".
const uuidLike = () =>
  vine.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

export const transferNodeValidator = vine.compile(
  vine.object({
    orgId: uuidLike().nullable().optional(),
    userId: uuidLike().nullable().optional(),
  })
)
