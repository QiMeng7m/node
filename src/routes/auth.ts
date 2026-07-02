import { Router } from 'express'
import { prisma } from '../db.js'
import { getClientIp } from '../lib/clientIp.js'
import { sendError } from '../lib/errors.js'
import { signAccessToken } from '../lib/jwt.js'
import { hashPassword, validatePassword, verifyPassword } from '../lib/password.js'
import {
  assertIpRegisterAllowed,
  incrementIpRegisterCount,
} from '../lib/quota.js'
import { toUserPublic } from '../lib/userDto.js'
import { readUsernamePassword, validateUsername } from '../lib/username.js'
import {
  getTurnstileSiteKey,
  isTurnstileEnabled,
  verifyTurnstileToken,
} from '../lib/turnstile.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const authRouter = Router()

function isRegistrationEnabled(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true'
}

function issueToken(user: { id: string; role: string; tokenVersion: number }): string {
  return signAccessToken({ sub: user.id, role: user.role, tv: user.tokenVersion })
}

function readTurnstileToken(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined
  const token = (body as Record<string, unknown>).turnstileToken
  return typeof token === 'string' ? token : undefined
}

authRouter.get('/captcha-config', (_req, res) => {
  const enabled = isTurnstileEnabled()
  const siteKey = getTurnstileSiteKey()
  if (enabled && !siteKey) {
    res.json({ enabled: false })
    return
  }
  res.json({ enabled, siteKey: enabled ? siteKey : undefined })
})

authRouter.post('/register', async (req, res) => {
  if (!isRegistrationEnabled()) {
    sendError(res, 403, 'FORBIDDEN', '注册已关闭，请联系管理员开通账号')
    return
  }

  const captchaError = await verifyTurnstileToken(readTurnstileToken(req.body), req)
  if (captchaError) {
    sendError(res, 400, 'VALIDATION_ERROR', captchaError)
    return
  }

  const clientIp = getClientIp(req)
  const ipError = await assertIpRegisterAllowed(clientIp)
  if (ipError) {
    sendError(res, 429, 'RATE_LIMITED', ipError)
    return
  }

  const creds = readUsernamePassword(req.body)
  if (!creds) {
    sendError(res, 400, 'VALIDATION_ERROR', '请提供账号和密码')
    return
  }

  const usernameError = validateUsername(creds.username)
  if (usernameError) {
    sendError(res, 400, 'VALIDATION_ERROR', usernameError)
    return
  }

  const passwordError = validatePassword(creds.password)
  if (passwordError) {
    sendError(res, 400, 'VALIDATION_ERROR', passwordError)
    return
  }

  const existing = await prisma.user.findUnique({ where: { username: creds.username } })
  if (existing) {
    sendError(res, 400, 'VALIDATION_ERROR', '该账号已被注册')
    return
  }

  const defaultQuota = Number(process.env.DEFAULT_USER_QUOTA) || 50
  const passwordHash = await hashPassword(creds.password)
  const user = await prisma.user.create({
    data: {
      username: creds.username,
      passwordHash,
      role: 'user',
      quotaLimit: defaultQuota,
      registeredIp: clientIp,
    },
  })

  await incrementIpRegisterCount(clientIp)

  res.status(201).json({ user: toUserPublic(user), accessToken: issueToken(user) })
})

authRouter.post('/login', async (req, res) => {
  const captchaError = await verifyTurnstileToken(readTurnstileToken(req.body), req)
  if (captchaError) {
    sendError(res, 400, 'VALIDATION_ERROR', captchaError)
    return
  }

  const creds = readUsernamePassword(req.body)
  if (!creds) {
    sendError(res, 400, 'VALIDATION_ERROR', '请提供账号和密码')
    return
  }

  const user = await prisma.user.findUnique({ where: { username: creds.username } })
  if (!user || !(await verifyPassword(creds.password, user.passwordHash))) {
    sendError(res, 401, 'UNAUTHORIZED', '账号或密码错误')
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
