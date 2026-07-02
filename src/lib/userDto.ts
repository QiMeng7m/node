import type { User } from '@prisma/client'
import { quotaRemaining } from './quota.js'

export type UserPublic = {
  id: string
  username: string
  role: 'admin' | 'user'
  quotaLimit: number
  quotaUsed: number
  quotaRemaining: number
  proAccess: boolean
  createdAt: string
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    role: user.role as 'admin' | 'user',
    quotaLimit: user.quotaLimit,
    quotaUsed: user.quotaUsed,
    quotaRemaining: quotaRemaining(user.quotaUsed, user.quotaLimit),
    proAccess: user.proAccess,
    createdAt: user.createdAt.toISOString(),
  }
}
