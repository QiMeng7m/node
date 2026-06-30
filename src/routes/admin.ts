import { Router } from 'express'
import { prisma } from '../db.js'
import {
  slugifyName,
  toFeatureAdmin,
  toModelAdmin,
  toProviderAdmin,
} from '../lib/adminDto.js'
import { sendError } from '../lib/errors.js'
import { hashPassword, validatePassword } from '../lib/password.js'
import { toUserPublic } from '../lib/userDto.js'
import { requireAdmin, type AuthedRequest } from '../middleware/auth.js'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

async function uniqueProviderSlug(base: string): Promise<string> {
  let slug = slugifyName(base)
  let n = 0
  while (true) {
    const candidate = n === 0 ? slug : `${slug}-${n}`
    const existing = await prisma.provider.findUnique({ where: { slug: candidate } })
    if (!existing) return candidate
    n += 1
  }
}

adminRouter.get('/users', async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10)
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  const usageRows = await prisma.usageDaily.findMany({
    where: { date: today, userId: { in: users.map((u) => u.id) } },
  })
  const usageMap = new Map(usageRows.map((row) => [row.userId, row.count]))

  res.json({
    items: users.map((u) => ({
      ...toUserPublic(u),
      enabled: u.enabled,
      todayUsage: usageMap.get(u.id) ?? 0,
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

  res.status(201).json({ ...toUserPublic(user), enabled: user.enabled, todayUsage: 0 })
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

  if (body.role === 'admin' || body.role === 'user') data.role = body.role
  if (typeof body.dailyQuota === 'number') data.dailyQuota = body.dailyQuota
  if (typeof body.enabled === 'boolean') {
    data.enabled = body.enabled
    if (!body.enabled) data.tokenVersion = { increment: 1 }
  }

  const updated = await prisma.user.update({ where: { id }, data })
  res.json({ ...toUserPublic(updated), enabled: updated.enabled })
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
  res.json({ items: providers.map(toProviderAdmin) })
})

adminRouter.post('/providers', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const baseURL = typeof body.baseURL === 'string' ? body.baseURL.trim() : ''
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : ''
  const enabled = body.enabled !== false

  if (!name || !baseURL || !apiKey) {
    sendError(res, 400, 'VALIDATION_ERROR', '请填写名称、Base URL 和 API Key')
    return
  }

  const slug = await uniqueProviderSlug(name)
  const provider = await prisma.provider.create({
    data: { slug, name, baseUrl: baseURL, apiKey, enabled },
  })
  res.status(201).json(toProviderAdmin(provider))
})

adminRouter.patch('/providers/:id', async (req, res) => {
  const id = String(req.params.id)
  const body = req.body as Record<string, unknown>
  const provider = await prisma.provider.findUnique({ where: { id } })
  if (!provider) {
    sendError(res, 404, 'NOT_FOUND', 'Provider 不存在')
    return
  }

  const data: { name?: string; baseUrl?: string; apiKey?: string; enabled?: boolean } = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.baseURL === 'string' && body.baseURL.trim()) data.baseUrl = body.baseURL.trim()
  if (typeof body.apiKey === 'string' && body.apiKey.trim()) data.apiKey = body.apiKey.trim()
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled

  res.json(toProviderAdmin(await prisma.provider.update({ where: { id }, data })))
})

adminRouter.delete('/providers/:id', async (req, res) => {
  const id = String(req.params.id)
  if (!(await prisma.provider.findUnique({ where: { id } }))) {
    sendError(res, 404, 'NOT_FOUND', 'Provider 不存在')
    return
  }
  await prisma.provider.delete({ where: { id } })
  res.status(204).end()
})

adminRouter.post('/providers/:id/test', async (req, res) => {
  const id = String(req.params.id)
  const provider = await prisma.provider.findUnique({ where: { id } })
  if (!provider) {
    sendError(res, 404, 'NOT_FOUND', 'Provider 不存在')
    return
  }

  const start = Date.now()
  try {
    const url = `${provider.baseUrl.replace(/\/$/, '')}/models`
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      sendError(res, 502, 'PROVIDER_ERROR', text || `连接失败：${response.status}`)
      return
    }
    res.json({ ok: true, latencyMs: Date.now() - start })
  } catch (err) {
    sendError(res, 502, 'PROVIDER_ERROR', err instanceof Error ? err.message : '连接失败')
  }
})

adminRouter.get('/models', async (_req, res) => {
  const models = await prisma.aiModel.findMany({ orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }] })
  res.json({ items: models.map(toModelAdmin) })
})

adminRouter.post('/models', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const providerId = typeof body.providerId === 'string' ? body.providerId : ''
  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : ''
  const label = typeof body.label === 'string' ? body.label.trim() : ''

  if (!providerId || !modelId || !label) {
    sendError(res, 400, 'VALIDATION_ERROR', '请填写 Provider、Model ID 和显示名')
    return
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId } })
  if (!provider) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Provider 不存在')
    return
  }

  const id = `${provider.slug}/${modelId}`
  if (await prisma.aiModel.findUnique({ where: { id } })) {
    sendError(res, 400, 'VALIDATION_ERROR', '该模型 ID 已存在')
    return
  }

  const tags = Array.isArray(body.tags) ? body.tags.filter((t) => typeof t === 'string') : []
  const model = await prisma.aiModel.create({
    data: {
      id,
      providerId,
      upstreamModelId: modelId,
      label,
      description: typeof body.description === 'string' ? body.description : null,
      tags: JSON.stringify(tags),
      supportsVision: body.supportsVision === true,
      costTier: typeof body.costTier === 'string' ? body.costTier : 'low',
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  })
  res.status(201).json(toModelAdmin(model))
})

adminRouter.patch('/models/:id', async (req, res) => {
  const id = String(req.params.id)
  const body = req.body as Record<string, unknown>
  if (!(await prisma.aiModel.findUnique({ where: { id } }))) {
    sendError(res, 404, 'NOT_FOUND', '模型不存在')
    return
  }

  const data: Record<string, unknown> = {}
  if (typeof body.label === 'string' && body.label.trim()) data.label = body.label.trim()
  if (typeof body.description === 'string') data.description = body.description || null
  if (Array.isArray(body.tags)) data.tags = JSON.stringify(body.tags.filter((t) => typeof t === 'string'))
  if (typeof body.supportsVision === 'boolean') data.supportsVision = body.supportsVision
  if (typeof body.costTier === 'string') data.costTier = body.costTier
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder
  if (typeof body.modelId === 'string' && body.modelId.trim()) data.upstreamModelId = body.modelId.trim()

  res.json(toModelAdmin(await prisma.aiModel.update({ where: { id }, data })))
})

adminRouter.delete('/models/:id', async (req, res) => {
  const id = String(req.params.id)
  if (!(await prisma.aiModel.findUnique({ where: { id } }))) {
    sendError(res, 404, 'NOT_FOUND', '模型不存在')
    return
  }
  await prisma.aiModel.delete({ where: { id } })
  res.status(204).end()
})

adminRouter.get('/features', async (_req, res) => {
  const features = await prisma.feature.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] })
  res.json({ items: features.map(toFeatureAdmin) })
})

adminRouter.post('/features', async (req, res) => {
  const body = req.body as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!id || !name) {
    sendError(res, 400, 'VALIDATION_ERROR', '请填写 Feature ID 和名称')
    return
  }
  if (await prisma.feature.findUnique({ where: { id } })) {
    sendError(res, 400, 'VALIDATION_ERROR', '该 Feature ID 已存在')
    return
  }

  const feature = await prisma.feature.create({
    data: {
      id,
      name,
      description: typeof body.description === 'string' ? body.description : '',
      icon: typeof body.icon === 'string' ? body.icon : null,
      category: typeof body.category === 'string' ? body.category : 'other',
      modelPolicy: typeof body.modelPolicy === 'string' ? body.modelPolicy : 'free',
      defaultModelId: typeof body.defaultModelId === 'string' ? body.defaultModelId || null : null,
      systemPrompt: typeof body.systemPrompt === 'string' ? body.systemPrompt : '',
      uiSchema:
        body.uiSchema && typeof body.uiSchema === 'object'
          ? JSON.stringify(body.uiSchema)
          : JSON.stringify({ type: 'plain' }),
      enabled: body.enabled !== false,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  })
  res.status(201).json(toFeatureAdmin(feature))
})

adminRouter.patch('/features/:id', async (req, res) => {
  const id = String(req.params.id)
  const body = req.body as Record<string, unknown>
  if (!(await prisma.feature.findUnique({ where: { id } }))) {
    sendError(res, 404, 'NOT_FOUND', 'Feature 不存在')
    return
  }

  const data: Record<string, unknown> = {}
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim()
  if (typeof body.description === 'string') data.description = body.description
  if (typeof body.icon === 'string') data.icon = body.icon || null
  if (typeof body.category === 'string') data.category = body.category
  if (typeof body.modelPolicy === 'string') data.modelPolicy = body.modelPolicy
  if (typeof body.defaultModelId === 'string') data.defaultModelId = body.defaultModelId || null
  if (typeof body.systemPrompt === 'string') data.systemPrompt = body.systemPrompt
  if (body.uiSchema && typeof body.uiSchema === 'object') data.uiSchema = JSON.stringify(body.uiSchema)
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled
  if (typeof body.sortOrder === 'number') data.sortOrder = body.sortOrder

  res.json(toFeatureAdmin(await prisma.feature.update({ where: { id }, data })))
})

adminRouter.delete('/features/:id', async (req, res) => {
  const id = String(req.params.id)
  if (!(await prisma.feature.findUnique({ where: { id } }))) {
    sendError(res, 404, 'NOT_FOUND', 'Feature 不存在')
    return
  }
  await prisma.feature.delete({ where: { id } })
  res.status(204).end()
})
