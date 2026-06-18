import { Router } from 'express'
import { prisma } from '../db.js'
import { sendError } from '../lib/errors.js'
import { hashPassword, validatePassword } from '../lib/password.js'
import { toUserPublic } from '../lib/userDto.js'
import { requireAdmin, type AuthedRequest } from '../middleware/auth.js'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

adminRouter.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({
    items: users.map((u) => ({
      ...toUserPublic(u),
      enabled: u.enabled,
      todayUsage: undefined,
    })),
  })
})

adminRouter.post('/users', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const role = body.role === 'admin' ? 'admin' : 'user'
  const dailyQuota = typeof body.dailyQuota === 'number' ? body.dailyQuota : 100

  if (!email || !password) {
    sendError(res, 400, 'VALIDATION_ERROR', '请提供邮箱和初始密码')
    return
  }

  const passwordError = validatePassword(password)
  if (passwordError) {
    sendError(res, 400, 'VALIDATION_ERROR', passwordError)
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    sendError(res, 400, 'VALIDATION_ERROR', '该邮箱已存在')
    return
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      role,
      dailyQuota,
    },
  })

  res.status(201).json({
    ...toUserPublic(user),
    enabled: user.enabled,
  })
})

adminRouter.patch('/users/:id', async (req: AuthedRequest, res) => {
  const id = String(req.params.id)
  const body = req.body as Record<string, unknown>

  const user = await prisma.user.findUnique({ where: { id } })
  if (!user) {
    sendError(res, 404, 'NOT_FOUND', '用户不存在')
    return
  }

  const data: {
    role?: string
    dailyQuota?: number
    enabled?: boolean
    tokenVersion?: { increment: number }
  } = {}

  if (body.role === 'admin' || body.role === 'user') {
    data.role = body.role
  }
  if (typeof body.dailyQuota === 'number') {
    data.dailyQuota = body.dailyQuota
  }
  if (typeof body.enabled === 'boolean') {
    data.enabled = body.enabled
    if (!body.enabled) {
      data.tokenVersion = { increment: 1 }
    }
  }

  const updated = await prisma.user.update({ where: { id }, data })
  res.json({
    ...toUserPublic(updated),
    enabled: updated.enabled,
  })
})

adminRouter.get('/stats', async (_req, res) => {
  const userCount = await prisma.user.count({ where: { enabled: true } })
  res.json({
    date: new Date().toISOString().slice(0, 10),
    totalRequests: 0,
    activeUsers: userCount,
    errorCount: 0,
    topModels: [],
  })
})

adminRouter.get('/providers', async (_req, res) => {
  const providers = await prisma.provider.findMany({ orderBy: { createdAt: 'desc' } })
  res.json({
    items: providers.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      baseUrl: p.baseUrl,
      enabled: p.enabled,
      hasApiKey: Boolean(p.apiKey),
      createdAt: p.createdAt.toISOString(),
    })),
  })
})

adminRouter.get('/models', async (_req, res) => {
  const models = await prisma.aiModel.findMany({
    include: { provider: true },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })
  res.json({
    items: models.map((m) => ({
      id: m.id,
      label: m.label,
      upstreamModelId: m.upstreamModelId,
      providerId: m.providerId,
      providerName: m.provider.name,
      enabled: m.enabled,
      recommended: m.recommended,
    })),
  })
})

adminRouter.get('/features', async (_req, res) => {
  const features = await prisma.feature.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  res.json({
    items: features.map((f) => ({
      id: f.id,
      name: f.name,
      category: f.category,
      modelPolicy: f.modelPolicy,
      defaultModelId: f.defaultModelId,
      enabled: f.enabled,
    })),
  })
})
