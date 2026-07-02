import type { AiModel } from '@prisma/client'
import type { UserPublic } from './userDto.js'

/** 管理员与已授权用户可使用 requiresPermission 模型 */
export function userCanAccessModel(
  user: UserPublic | undefined,
  model: Pick<AiModel, 'requiresPermission'>,
): boolean {
  if (!model.requiresPermission) return true
  if (!user) return false
  if (user.role === 'admin') return true
  return user.proAccess
}

export function filterModelsForUser<T extends Pick<AiModel, 'requiresPermission'>>(
  models: T[],
  user: UserPublic | undefined,
): T[] {
  return models.filter((model) => userCanAccessModel(user, model))
}
