import type { User } from '@prisma/client'

export type UserPublic = {
  id: string
  email: string
  role: 'admin' | 'user'
  dailyQuota: number
  createdAt: string
}

export function toUserPublic(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    role: user.role as 'admin' | 'user',
    dailyQuota: user.dailyQuota,
    createdAt: user.createdAt.toISOString(),
  }
}
