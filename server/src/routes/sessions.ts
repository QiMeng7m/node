import { Router } from 'express'
import { prisma } from '../db.js'
import { sendError } from '../lib/errors.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const sessionsRouter = Router()

sessionsRouter.use(requireAuth)

function readSessionId(req: AuthedRequest): string {
  return String(req.params.id)
}

sessionsRouter.get('/', async (req: AuthedRequest, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''

  const where = {
    userId: req.userId!,
    ...(q ? { title: { contains: q } } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.chatSession.count({ where }),
  ])

  res.json({
    items: items.map((s) => ({
      id: s.id,
      title: s.title,
      defaultModelId: s.defaultModelId ?? undefined,
      featureId: s.featureId ?? undefined,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  })
})

sessionsRouter.post('/', async (req: AuthedRequest, res) => {
  const body = req.body as Record<string, unknown>
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '新对话'
  const defaultModelId = typeof body.defaultModelId === 'string' ? body.defaultModelId : undefined
  const featureId = typeof body.featureId === 'string' ? body.featureId : undefined

  const session = await prisma.chatSession.create({
    data: {
      userId: req.userId!,
      title,
      defaultModelId,
      featureId,
    },
  })

  res.status(201).json({
    id: session.id,
    title: session.title,
    defaultModelId: session.defaultModelId ?? undefined,
    featureId: session.featureId ?? undefined,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  })
})

sessionsRouter.get('/:id', async (req: AuthedRequest, res) => {
  const id = readSessionId(req)
  const session = await prisma.chatSession.findFirst({
    where: { id, userId: req.userId! },
    include: {
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!session) {
    sendError(res, 404, 'NOT_FOUND', '会话不存在')
    return
  }

  res.json({
    id: session.id,
    title: session.title,
    defaultModelId: session.defaultModelId ?? undefined,
    featureId: session.featureId ?? undefined,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.map((m) => ({
      id: m.id,
      sessionId: m.sessionId,
      role: m.role,
      content: m.content,
      modelId: m.modelId ?? undefined,
      attachments: m.attachments ? JSON.parse(m.attachments) : undefined,
      createdAt: m.createdAt.toISOString(),
    })),
  })
})

sessionsRouter.patch('/:id', async (req: AuthedRequest, res) => {
  const id = readSessionId(req)
  const existing = await prisma.chatSession.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!existing) {
    sendError(res, 404, 'NOT_FOUND', '会话不存在')
    return
  }

  const body = req.body as Record<string, unknown>
  const data: {
    title?: string
    defaultModelId?: string | null
    featureId?: string | null
  } = {}

  if (typeof body.title === 'string' && body.title.trim()) {
    data.title = body.title.trim()
  }
  if (typeof body.defaultModelId === 'string') {
    data.defaultModelId = body.defaultModelId
  }
  if (typeof body.featureId === 'string') {
    data.featureId = body.featureId
  }

  const session = await prisma.chatSession.update({
    where: { id: existing.id },
    data: { ...data, updatedAt: new Date() },
  })

  res.json({
    id: session.id,
    title: session.title,
    defaultModelId: session.defaultModelId ?? undefined,
    featureId: session.featureId ?? undefined,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  })
})

sessionsRouter.delete('/:id', async (req: AuthedRequest, res) => {
  const id = readSessionId(req)
  const existing = await prisma.chatSession.findFirst({
    where: { id, userId: req.userId! },
  })
  if (!existing) {
    sendError(res, 404, 'NOT_FOUND', '会话不存在')
    return
  }

  await prisma.chatSession.delete({ where: { id: existing.id } })
  res.status(204).end()
})
