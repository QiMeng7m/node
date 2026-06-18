import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

const SEED_ADMIN_EMAIL = 'admin@example.com'
const SEED_ADMIN_PASSWORD = 'admin123456'

const DEFAULT_MODEL_ID = 'default/deepseek-chat'
const CODER_MODEL_ID = 'default/deepseek-coder'

const FEATURE_SEED = [
  {
    id: 'free-chat',
    name: '自由闲聊',
    description: '想聊啥聊啥',
    icon: '💬',
    category: 'chat',
    modelPolicy: 'free',
    systemPrompt: '你是一只亲切友好的猫猫助手，用简洁中文回答用户问题。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 0,
  },
  {
    id: 'tech-qa',
    name: '技术问答',
    description: '代码 debug',
    icon: '🛠',
    category: 'code',
    modelPolicy: 'recommended',
    defaultModelId: CODER_MODEL_ID,
    systemPrompt:
      '你是资深软件工程师，擅长阅读代码与报错并给出可执行的修复步骤。回答要结构化，必要时给出命令或代码片段。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 1,
  },
  {
    id: 'doc-generate',
    name: '文档生成',
    description: '表单写稿',
    icon: '📄',
    category: 'doc',
    modelPolicy: 'recommended',
    defaultModelId: DEFAULT_MODEL_ID,
    systemPrompt:
      '你是技术文档写作助手。根据用户提供的标题、类型与要点，输出结构清晰的 Markdown 文档，包含适当的小标题与列表。',
    uiSchema: JSON.stringify({
      type: 'form',
      fields: [
        { key: 'title', label: '📌 标题', type: 'text', required: true, placeholder: 'Q2 技术复盘' },
        {
          key: 'docType',
          label: '📂 文档类型',
          type: 'select',
          options: [
            { label: '技术方案', value: 'tech-plan' },
            { label: '会议纪要', value: 'meeting' },
            { label: '项目总结', value: 'summary' },
          ],
        },
        {
          key: 'points',
          label: '💡 要点',
          type: 'textarea',
          required: true,
          placeholder: '列出文档要点…',
        },
      ],
    }),
    sortOrder: 2,
  },
  {
    id: 'polish',
    name: '文本润色',
    description: '变更好看',
    icon: '✨',
    category: 'other',
    modelPolicy: 'free',
    systemPrompt: '你是中文润色助手，保持原意，优化表达，使文字更流畅专业。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 3,
  },
  {
    id: 'summarize',
    name: '内容摘要',
    description: '长文变短',
    icon: '📋',
    category: 'other',
    modelPolicy: 'free',
    systemPrompt: '你是摘要助手，用条目列出关键信息，语言简洁。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 4,
  },
  {
    id: 'vision',
    name: '图片分析',
    description: '看懂截图',
    icon: '🖼',
    category: 'image',
    modelPolicy: 'locked',
    defaultModelId: DEFAULT_MODEL_ID,
    systemPrompt: '你是视觉分析助手，描述图片内容并回答用户关于图片的问题。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 5,
  },
] as const

async function seedFeatures() {
  for (const feature of FEATURE_SEED) {
    await prisma.feature.upsert({
      where: { id: feature.id },
      create: feature,
      update: {
        name: feature.name,
        description: feature.description,
        icon: feature.icon,
        category: feature.category,
        modelPolicy: feature.modelPolicy,
        defaultModelId: 'defaultModelId' in feature ? feature.defaultModelId : null,
        systemPrompt: feature.systemPrompt,
        uiSchema: feature.uiSchema,
        sortOrder: feature.sortOrder,
        enabled: true,
      },
    })
  }
}

async function seedProviderFromEnv() {
  const apiKey = process.env.LLM_API_KEY?.trim()
  const baseUrl = process.env.LLM_BASE_URL?.trim() || 'https://api.deepseek.com/v1'
  if (!apiKey) {
    console.log('LLM_API_KEY 未配置，跳过 Provider/模型种子（模型列表将为空）')
    return
  }

  const provider = await prisma.provider.upsert({
    where: { slug: 'default' },
    create: {
      slug: 'default',
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'Default LLM',
      baseUrl,
      apiKey,
      enabled: true,
    },
    update: {
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'Default LLM',
      baseUrl,
      apiKey,
      enabled: true,
    },
  })

  const chatUpstream = process.env.LLM_MODEL?.trim() || 'deepseek-chat'
  const coderUpstream = process.env.LLM_CODER_MODEL?.trim() || 'deepseek-coder'

  await prisma.aiModel.upsert({
    where: { id: DEFAULT_MODEL_ID },
    create: {
      id: DEFAULT_MODEL_ID,
      providerId: provider.id,
      upstreamModelId: chatUpstream,
      label: 'DeepSeek Chat',
      description: '通用对话，响应快',
      tags: JSON.stringify(['fast']),
      supportsVision: false,
      supportsStream: true,
      costTier: 'low',
      recommended: true,
      enabled: true,
      sortOrder: 0,
    },
    update: {
      providerId: provider.id,
      upstreamModelId: chatUpstream,
      label: 'DeepSeek Chat',
      description: '通用对话，响应快',
      tags: JSON.stringify(['fast']),
      recommended: true,
      enabled: true,
    },
  })

  await prisma.aiModel.upsert({
    where: { id: CODER_MODEL_ID },
    create: {
      id: CODER_MODEL_ID,
      providerId: provider.id,
      upstreamModelId: coderUpstream,
      label: 'DeepSeek Coder',
      description: '代码与技术问答',
      tags: JSON.stringify(['code']),
      supportsVision: false,
      supportsStream: true,
      costTier: 'low',
      enabled: true,
      sortOrder: 1,
    },
    update: {
      providerId: provider.id,
      upstreamModelId: coderUpstream,
      label: 'DeepSeek Coder',
      description: '代码与技术问答',
      tags: JSON.stringify(['code']),
      enabled: true,
    },
  })

  console.log(`Seed LLM provider: ${provider.name} (${baseUrl})`)
  console.log(`Seed models: ${DEFAULT_MODEL_ID}, ${CODER_MODEL_ID}`)
}

async function main() {
  const postCount = await prisma.post.count()
  if (postCount === 0) {
    await prisma.post.createMany({
      data: [
        {
          title: '欢迎来到我的网站',
          summary: '这是我的第一篇文章，记录搭建这个站点的过程。',
          content: '',
          createdAt: new Date('2026-06-18'),
        },
        {
          title: '为什么选择 React + Node',
          summary: '前后端统一使用 JavaScript 生态，上手更快，迭代更灵活。',
          content: '',
          createdAt: new Date('2026-06-17'),
        },
      ],
    })
  }

  const admin = await prisma.user.findUnique({ where: { email: SEED_ADMIN_EMAIL } })
  if (!admin) {
    await prisma.user.create({
      data: {
        email: SEED_ADMIN_EMAIL,
        passwordHash: await hashPassword(SEED_ADMIN_PASSWORD),
        role: 'admin',
        dailyQuota: 100,
      },
    })
    console.log(`Seed admin: ${SEED_ADMIN_EMAIL} / ${SEED_ADMIN_PASSWORD}`)
  }

  const userEmail = 'user@example.com'
  const demoUser = await prisma.user.findUnique({ where: { email: userEmail } })
  if (!demoUser) {
    await prisma.user.create({
      data: {
        email: userEmail,
        passwordHash: await hashPassword('user123456'),
        role: 'user',
        dailyQuota: 50,
      },
    })
    console.log(`Seed user: ${userEmail} / user123456`)
  }

  await seedFeatures()
  await seedProviderFromEnv()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
