import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'
import { sendError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { toUserPublic, type UserPublic } from '../lib/userDto.js'

export type AuthedRequest = Request & {
  user?: UserPublic
  userId?: string
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/** 校验 JWT 并从数据库加载用户（每次请求查库，禁用/改密后 tokenVersion 失效） */
export async function loadUserFromToken(token: string): Promise<UserPublic | null> {
  try {
    const payload = verifyAccessToken(token)
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || !user.enabled) return null
    if (payload.tv !== user.tokenVersion) return null
    return toUserPublic(user)
  } catch {
    return null
  }
}

export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req)
  if (token) {
    const user = await loadUserFromToken(token)
    if (user) {
      req.user = user
      req.userId = user.id
    }
  }
  next()
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req)
  if (!token) {
    sendError(res, 401, 'UNAUTHORIZED', '请先登录')
    return
  }

  const user = await loadUserFromToken(token)
  if (!user) {
    sendError(res, 401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    return
  }

  req.user = user
  req.userId = user.id
  next()
}

export async function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      sendError(res, 403, 'FORBIDDEN', '需要管理员权限')
      return
    }
    next()
  })
}
