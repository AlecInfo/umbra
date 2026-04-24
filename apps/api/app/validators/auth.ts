import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().toLowerCase().maxLength(255),
    password: vine.string().minLength(8).maxLength(128),
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
  })
)

export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().toLowerCase().maxLength(255),
    password: vine.string().minLength(1).maxLength(128),
  })
)

export const updateProfileValidator = vine.compile(
  vine.object({
    name: vine.string().trim().minLength(1).maxLength(100).optional(),
    avatarUrl: vine.string().url().maxLength(2000).nullable().optional(),
  })
)

export const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(1).maxLength(128),
    newPassword: vine.string().minLength(8).maxLength(128),
  })
)
