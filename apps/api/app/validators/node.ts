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
    orgId: vine.string().uuid().optional(),
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
    orgId: vine.string().uuid().optional(),
    status: status.optional(),
    category: category.optional(),
    page: vine.number().positive().optional(),
    perPage: vine.number().range([1, 200]).optional(),
  })
)
