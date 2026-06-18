import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../db.js'
import {
  getEnabledFeatureById,
  getEnabledModelById,
  getTodayUsage,
  incrementTodayUsage,
} from '../lib/catalog.js'
import { sendError } from '../lib/errors.js'
import { endSse, initSse, writeSse } from '../lib/sse.js'
import { streamUpstreamChat } from '../providers/stream.js'
import type { UpstreamMessage } from '../providers/openai.js'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'

export const chatRouter = Router()

interface ChatRequestBody {
  sessionId?: string
  model: string
  featureId?: string
  message: string
  formData?: Record<string, string>
}

function buildUserContent(message: string, formData?: Record<string, string>): string {
  const trimmed = message.trim()
  if (trimmed) return trimmed

  if (!formData) return ''
  const lines = Object.entries(formData)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `${k}: ${v}`)
  return lines.join('\n')
}

function applyPromptTemplate(template: string, formData?: Record<string, string>): string {
  if (!formData) return template
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => formData[key] ?? '')
}

chatRouter.post('/', requireAuth, async (req: AuthedRequest, res) => {
  const body = req.body as ChatRequestBody
  const userId = req.userId!
  const user = req.user!

  if (!body || typeof body.model !== 'string' || !body.model.trim()) {
    sendError(res, 400, 'VALIDATION_ERROR', '请选择模型')
    return
  }

  const modelRecord = await getEnabledModelById(body.model.trim())
  if (!modelRecord) {
    sendError(res, 503, 'MODEL_UNAVAILABLE', '所选模型不可用，请更换模型或联系管理员')
    return
  }

  const featureId = body.featureId?.trim() || 'free-chat'
  const feature = await getEnabledFeatureById(featureId)
  if (!feature) {
    sendError(res, 400, 'VALIDATION_ERROR', '所选场景不可用')
    return
  }

  let finalModel = modelRecord
  if (feature.modelPolicy === 'locked' && feature.defaultModelId) {
    const locked = await getEnabledModelById(feature.defaultModelId)
    if (!locked) {
      sendError(res, 503, 'MODEL_UNAVAILABLE', '该场景绑定的模型不可用')
      return
    }
    finalModel = locked
  }

  const userContent = buildUserContent(body.message ?? '', body.formData)
  if (!userContent) {
    sendError(res, 400, 'VALIDATION_ERROR', '消息内容不能为空')
    return
  }

  const usedToday = await getTodayUsage(userId)
  if (usedToday >= user.dailyQuota) {
    sendError(res, 429, 'RATE_LIMITED', '今日请求次数已达上限')
    return
  }

  let sessionId = body.sessionId?.trim()
  let session = sessionId
    ? await prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
    : null

  if (sessionId && !session) {
    sendError(res, 404, 'NOT_FOUND', '会话不存在')
    return
  }

  const isNewSession = !session
  if (!session) {
    session = await prisma.chatSession.create({
      data: {
        userId,
        title: userContent.slice(0, 40) || '新对话',
        defaultModelId: finalModel.id,
        featureId: feature.id,
      },
    })
    sessionId = session.id
  }

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: 'user',
      content: userContent,
    },
  })

  await prisma.chatSession.update({
    where: { id: session.id },
    data: { updatedAt: new Date() },
  })

  const history = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'asc' },
  })

  const upstreamMessages: UpstreamMessage[] = []
  const systemPrompt = applyPromptTemplate(feature.systemPrompt, body.formData).trim()
  if (systemPrompt) {
    upstreamMessages.push({ role: 'system', content: systemPrompt })
  }

  for (const msg of history) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      upstreamMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })
    }
  }

  const assistantMessageId = randomUUID()
  initSse(res)

  if (isNewSession) {
    writeSse(res, 'session', { sessionId: session.id })
  }

  writeSse(res, 'message_start', {
    messageId: assistantMessageId,
    model: finalModel.id,
    featureId: feature.id,
  })

  let assistantContent = ''
  let usage: { promptTokens: number; completionTokens: number; totalTokens: number } | undefined

  const upstreamAbort = new AbortController()
  const onClose = () => upstreamAbort.abort()
  req.on('close', onClose)

  try {
    for await (const chunk of streamUpstreamChat(
      finalModel.provider.protocol,
      finalModel.provider.baseUrl,
      finalModel.provider.apiKey,
      finalModel.upstreamModelId,
      upstreamMessages,
      upstreamAbort.signal,
    )) {
      if (chunk.delta) {
        assistantContent += chunk.delta
        writeSse(res, 'content_delta', { delta: chunk.delta })
      }
      if (chunk.usage) {
        usage = chunk.usage
      }
    }

    if (!assistantContent.trim()) {
      throw new Error('模型未返回内容，请检查 Provider 协议、Base URL 与模型名称')
    }

    await prisma.chatMessage.create({
      data: {
        id: assistantMessageId,
        sessionId: session.id,
        role: 'assistant',
        content: assistantContent,
        modelId: finalModel.id,
      },
    })

    await incrementTodayUsage(userId)

    writeSse(res, 'message_end', {
      messageId: assistantMessageId,
      usage,
    })
    writeSse(res, 'done', {})
    endSse(res)
  } catch (err) {
    if (res.writableEnded) return
    const message = err instanceof Error ? err.message : '模型调用失败'
    writeSse(res, 'error', { code: 'PROVIDER_ERROR', message })
    writeSse(res, 'done', {})
    endSse(res)
  } finally {
    req.off('close', onClose)
  }
})
