import vine from '@vinejs/vine'

// owner is granted at creation and transferred deliberately, never handed out
// through an invitation or a role change.
const assignableRole = vine.enum(['admin', 'member'] as const)

export const createOrgValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100),
  })
)

export const updateOrgValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)

export const inviteValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().maxLength(255),
    role: assignableRole.optional(),
  })
)

export const updateMemberValidator = vine.compile(
  vine.object({
    role: assignableRole,
  })
)

export const acceptInviteValidator = vine.compile(
  vine.object({
    token: vine.string().minLength(20).maxLength(200),
  })
)
