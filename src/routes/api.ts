import { Router } from 'express'
import { prisma } from '../db.js'
import { adminRouter } from './admin.js'
import { authRouter } from './auth.js'
import { catalogRouter } from './catalog.js'
import { chatRouter } from './chat.js'
import { sessionsRouter } from './sessions.js'

export const apiRouter = Router()

apiRouter.use('/auth', authRouter)
apiRouter.use('/admin', adminRouter)
apiRouter.use('/', catalogRouter)
apiRouter.use('/chat', chatRouter)
apiRouter.use('/sessions', sessionsRouter)

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

apiRouter.get('/posts', async (_req, res) => {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
    })
    res.json(
      posts.map((post) => ({
        id: post.id,
        title: post.title,
        summary: post.summary,
        createdAt: post.createdAt.toISOString(),
      })),
    )
  } catch {
    res.status(500).json({ message: '获取文章失败' })
  }
})

apiRouter.get('/posts/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (Number.isNaN(id)) {
    res.status(400).json({ message: '无效的文章 ID' })
    return
  }

  try {
    const post = await prisma.post.findUnique({ where: { id } })
    if (!post) {
      res.status(404).json({ message: '文章不存在' })
      return
    }
    res.json({
      id: post.id,
      title: post.title,
      summary: post.summary,
      content: post.content,
      createdAt: post.createdAt.toISOString(),
    })
  } catch {
    res.status(500).json({ message: '获取文章失败' })
  }
})
