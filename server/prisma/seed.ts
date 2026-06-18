import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'

const prisma = new PrismaClient()

const SEED_ADMIN_EMAIL = 'admin@example.com'
const SEED_ADMIN_PASSWORD = 'admin123456'

const DEFAULT_MODEL_ID = 'default/glm-5.1'
const CODER_MODEL_ID = 'default/kimi-for-coding'

/** JZ Internal one-api 可用模型（与网关列表一致） */
const MODEL_SEED = [
  {
    id: 'default/deepseek-v4-pro',
    upstreamModelId: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    description: 'DeepSeek 旗舰',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 0,
  },
  {
    id: 'default/glm-5.1',
    upstreamModelId: 'glm-5.1',
    label: 'GLM 5.1',
    description: '智谱 GLM 5.1',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 1,
  },
  {
    id: 'default/deepseek-v4-flash',
    upstreamModelId: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    description: 'DeepSeek 快速版',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 2,
  },
  {
    id: 'default/glm-5.2',
    upstreamModelId: 'glm-5.2',
    label: 'GLM 5.2',
    description: '智谱 GLM 5.2',
    tags: ['strong'],
    costTier: 'low',
    sortOrder: 3,
  },
  {
    id: 'default/mimo-v2.5-pro',
    upstreamModelId: 'mimo-v2.5-pro',
    label: 'MiMo V2.5 Pro',
    description: 'MiMo 增强版',
    tags: ['strong'],
    costTier: 'low',
    sortOrder: 4,
  },
  {
    id: 'default/gpt-5.5',
    upstreamModelId: 'gpt-5.5',
    label: 'GPT 5.5',
    description: 'OpenAI GPT 5.5',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 5,
  },
  {
    id: 'default/glm-5-turbo',
    upstreamModelId: 'glm-5-turbo',
    label: 'GLM 5 Turbo',
    description: '智谱 GLM 5 Turbo',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 6,
  },
  {
    id: 'default/claude-opus-4-7',
    upstreamModelId: 'claude-opus-4-7',
    label: 'Claude Opus 4.7',
    description: 'Anthropic Opus 4.7',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 7,
  },
  {
    id: 'default/claude-opus-4-8',
    upstreamModelId: 'claude-opus-4-8',
    label: 'Claude Opus 4.8',
    description: 'Anthropic Opus 4.8',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 8,
  },
  {
    id: 'default/minimax-m2.7-highspeed',
    upstreamModelId: 'MiniMax-M2.7-highspeed',
    label: 'MiniMax M2.7 Highspeed',
    description: 'MiniMax 高速版',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 9,
  },
  {
    id: 'default/mimo-v2.5',
    upstreamModelId: 'mimo-v2.5',
    label: 'MiMo V2.5',
    description: 'MiMo 标准版',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 10,
  },
  {
    id: 'default/kimi-k2.6',
    upstreamModelId: 'kimi-k2.6',
    label: 'Kimi K2.6',
    description: 'Kimi 对话模型',
    tags: ['strong'],
    costTier: 'low',
    sortOrder: 11,
  },
  {
    id: 'default/kimi-for-coding',
    upstreamModelId: 'kimi-for-coding',
    label: 'Kimi for Coding',
    description: 'Kimi 代码专用',
    tags: ['code'],
    costTier: 'low',
    sortOrder: 12,
  },
  {
    id: 'default/claude-sonnet-4-6',
    upstreamModelId: 'claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    description: 'Anthropic Sonnet 4.6',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 13,
  },
  {
    id: 'default/glm-4.5-air',
    upstreamModelId: 'glm-4.5-air',
    label: 'GLM 4.5 Air',
    description: '智谱 GLM 4.5 Air',
    tags: ['cheap', 'fast'],
    costTier: 'low',
    sortOrder: 14,
  },
  {
    id: 'default/cursor-claude-opus-4-7-max-fast',
    upstreamModelId: 'cursor-claude-opus-4-7-max-fast',
    label: 'Cursor Claude Opus 4.7 Max Fast',
    description: 'Cursor 代码加速',
    tags: ['code', 'fast'],
    costTier: 'high',
    sortOrder: 15,
  },
  {
    id: 'default/mimo-v2-pro',
    upstreamModelId: 'mimo-v2-pro',
    label: 'MiMo V2 Pro',
    description: 'MiMo Pro',
    tags: ['strong'],
    costTier: 'low',
    sortOrder: 16,
  },
  {
    id: 'default/minimax-m2.7',
    upstreamModelId: 'MiniMax-M2.7',
    label: 'MiniMax M2.7',
    description: 'MiniMax 标准版',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 17,
  },
  {
    id: 'default/claude-fable-5',
    upstreamModelId: 'claude-fable-5',
    label: 'Claude Fable 5',
    description: 'Anthropic Fable 5',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 18,
  },
  {
    id: 'default/glm-4.7',
    upstreamModelId: 'glm-4.7',
    label: 'GLM 4.7',
    description: '智谱 GLM 4.7',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 19,
  },
] as const

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
  const apiKey =
    process.env.ANTHROPIC_API_KEY?.trim() || process.env.LLM_API_KEY?.trim()
  const baseUrl =
    process.env.ANTHROPIC_BASE_URL?.trim() ||
    process.env.LLM_BASE_URL?.trim()?.replace(/\/v1\/?$/, '') ||
    'https://api.deepseek.com'
  const protocol =
    process.env.LLM_PROTOCOL?.trim() ||
    (process.env.ANTHROPIC_BASE_URL?.trim() ? 'anthropic' : 'openai-compat')
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY / LLM_API_KEY 未配置，跳过 Provider/模型种子')
    return
  }

  const provider = await prisma.provider.upsert({
    where: { slug: 'default' },
    create: {
      slug: 'default',
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'Default LLM',
      baseUrl,
      apiKey,
      protocol,
      enabled: true,
    },
    update: {
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'Default LLM',
      baseUrl,
      apiKey,
      protocol,
      enabled: true,
    },
  })

  // upstreamModelId 与 claude-jz.ps1 中 $env:ANTHROPIC_MODEL 取值一致
  const defaultRecommended =
    process.env.ANTHROPIC_MODEL?.trim() || process.env.LLM_MODEL?.trim() || 'glm-5.1'

  for (const model of MODEL_SEED) {
    const recommended = model.upstreamModelId === defaultRecommended
    const tags = JSON.stringify([...model.tags])
    const base = {
      providerId: provider.id,
      upstreamModelId: model.upstreamModelId,
      label: model.label,
      description: model.description,
      tags,
      supportsVision: false,
      supportsStream: true,
      costTier: model.costTier,
      recommended,
      enabled: true,
      sortOrder: model.sortOrder,
    }
    await prisma.aiModel.upsert({
      where: { id: model.id },
      create: { id: model.id, ...base },
      update: base,
    })
  }

  const seededIds = MODEL_SEED.map((m) => m.id)
  await prisma.aiModel.updateMany({
    where: { providerId: provider.id, id: { notIn: seededIds } },
    data: { enabled: false },
  })

  console.log(`Seed LLM provider: ${provider.name} (${baseUrl}, ${protocol})`)
  console.log(`Seed models: ${MODEL_SEED.length} items (ANTHROPIC_MODEL=${defaultRecommended})`)
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
