import { Router } from 'express'
import { prisma } from '../db.js'
import { sendError } from '../lib/errors.js'
import { signAccessToken } from '../lib/jwt.js'
import { hashPassword, validatePassword, verifyPassword } from '../lib/password.js'
import { toUserPublic } from '../lib/userDto.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const authRouter = Router()

function isRegistrationEnabled(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true'
}

function readCredentials(body: unknown): { email: string; password: string } | null {
  if (!body || typeof body !== 'object') return null
  const { email, password } = body as Record<string, unknown>
  if (typeof email !== 'string' || typeof password !== 'string') return null
  const trimmedEmail = email.trim().toLowerCase()
  if (!trimmedEmail || !password) return null
  return { email: trimmedEmail, password }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function issueToken(user: { id: string; role: string; tokenVersion: number }): string {
  return signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion })
}

authRouter.post('/register', async (req, res) => {
  if (!isRegistrationEnabled()) {
    sendError(res, 403, 'FORBIDDEN', '注册已关闭，请联系管理员开通账号')
    return
  }

  const creds = readCredentials(req.body)
  if (!creds) {
    sendError(res, 400, 'VALIDATION_ERROR', '请提供邮箱和密码')
    return
  }

  if (!isValidEmail(creds.email)) {
    sendError(res, 400, 'VALIDATION_ERROR', '邮箱格式不正确')
    return
  }

  const passwordError = validatePassword(creds.password)
  if (passwordError) {
    sendError(res, 400, 'VALIDATION_ERROR', passwordError)
    return
  }

  const existing = await prisma.user.findUnique({ where: { email: creds.email } })
  if (existing) {
    sendError(res, 400, 'VALIDATION_ERROR', '该邮箱已被注册')
    return
  }

  const passwordHash = await hashPassword(creds.password)
  const user = await prisma.user.create({
    data: {
      email: creds.email,
      passwordHash,
      role: 'user',
    },
  })

  res.status(201).json({ user: toUserPublic(user), accessToken: issueToken(user) })
})

authRouter.post('/login', async (req, res) => {
  const creds = readCredentials(req.body)
  if (!creds) {
    sendError(res, 400, 'VALIDATION_ERROR', '请提供邮箱和密码')
    return
  }

  const user = await prisma.user.findUnique({ where: { email: creds.email } })
  if (!user || !(await verifyPassword(creds.password, user.passwordHash))) {
    sendError(res, 401, 'UNAUTHORIZED', '邮箱或密码错误')
    return
  }

  if (!user.enabled) {
    sendError(res, 403, 'FORBIDDEN', '账号已禁用，请联系管理员')
    return
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  res.json({ user: toUserPublic(updated), accessToken: issueToken(updated) })
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } })
  if (!user || !user.enabled) {
    sendError(res, 401, 'UNAUTHORIZED', '登录已失效，请重新登录')
    return
  }
  res.json({ user: toUserPublic(user) })
})

authRouter.post('/logout', requireAuth, (_req, res) => {
  res.status(204).send()
})
