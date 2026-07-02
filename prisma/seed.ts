import { Prisma, PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password.js'
import { getDefaultOwnerProfile, OWNER_PROFILE_ROW_ID } from '../src/lib/ownerProfileDto.js'

const prisma = new PrismaClient()

type SeedUser = {
  username: string
  password: string
  role: string
  quotaLimit: number
  proAccess: boolean
}

async function ensureSeedUser(seed: SeedUser): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { username: seed.username } })
  if (!existing) {
    const data: Prisma.UserCreateInput = {
      username: seed.username,
      passwordHash: await hashPassword(seed.password),
      role: seed.role,
      quotaLimit: seed.quotaLimit,
      proAccess: seed.proAccess,
    }
    await prisma.user.create({ data })
    console.log(`Seed user: ${seed.username} / ${seed.password}`)
    return
  }

  if (seed.proAccess && !existing.proAccess) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { proAccess: true },
    })
  }
}

const SEED_ADMIN_USERNAME = 'admin'
const SEED_ADMIN_PASSWORD = 'admin123456'

const DEFAULT_MODEL_ID = 'deepseek/deepseek-v4-flash'
const PRO_MODEL_ID = 'deepseek/deepseek-v4-pro'

/** DeepSeek 官方 API 模型 */
const MODEL_SEED = [
  {
    id: 'deepseek/deepseek-v4-flash',
    upstreamModelId: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    description: '快速响应，所有用户可用',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 0,
    recommended: true,
    requiresPermission: false,
  },
  {
    id: PRO_MODEL_ID,
    upstreamModelId: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    description: '旗舰推理，需管理员授权',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 1,
    recommended: false,
    requiresPermission: true,
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
    defaultModelId: DEFAULT_MODEL_ID,
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
    modelPolicy: 'free',
    defaultModelId: DEFAULT_MODEL_ID,
    systemPrompt: '你是视觉分析助手，描述图片内容并回答用户关于图片的问题。',
    uiSchema: JSON.stringify({ type: 'plain' }),
    sortOrder: 5,
  },
] as const

function toFeaturePayload(
  feature: (typeof FEATURE_SEED)[number],
): Prisma.FeatureUncheckedCreateInput {
  return {
    id: feature.id,
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
  }
}

async function seedFeatures() {
  for (const feature of FEATURE_SEED) {
    const payload = toFeaturePayload(feature)
    await prisma.feature.upsert({
      where: { id: feature.id },
      create: payload,
      update: {
        name: payload.name,
        description: payload.description,
        icon: payload.icon,
        category: payload.category,
        modelPolicy: payload.modelPolicy,
        defaultModelId: payload.defaultModelId,
        systemPrompt: payload.systemPrompt,
        uiSchema: payload.uiSchema,
        sortOrder: payload.sortOrder,
        enabled: true,
      },
    })
  }
}

async function seedProviderFromEnv() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim() || process.env.LLM_API_KEY?.trim()
  const baseUrl =
    process.env.DEEPSEEK_BASE_URL?.trim() ||
    process.env.LLM_BASE_URL?.trim()?.replace(/\/v1\/?$/, '') ||
    'https://api.deepseek.com'
  const protocol = 'openai-compat'

  if (!apiKey) {
    console.log('DEEPSEEK_API_KEY / LLM_API_KEY 未配置，跳过 Provider/模型种子')
    return
  }

  const provider = await prisma.provider.upsert({
    where: { slug: 'deepseek' },
    create: {
      slug: 'deepseek',
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'DeepSeek',
      baseUrl,
      apiKey,
      protocol,
      enabled: true,
    },
    update: {
      name: process.env.LLM_PROVIDER_NAME?.trim() || 'DeepSeek',
      baseUrl,
      apiKey,
      protocol,
      enabled: true,
    },
  })

  for (const model of MODEL_SEED) {
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
      recommended: model.recommended,
      requiresPermission: model.requiresPermission,
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

  // 停用旧 default provider 下的模型
  const legacyProvider = await prisma.provider.findUnique({ where: { slug: 'default' } })
  if (legacyProvider) {
    await prisma.aiModel.updateMany({
      where: { providerId: legacyProvider.id },
      data: { enabled: false },
    })
    await prisma.provider.update({
      where: { id: legacyProvider.id },
      data: { enabled: false },
    })
  }

  console.log(`Seed LLM provider: ${provider.name} (${baseUrl})`)
  console.log(`Seed models: ${MODEL_SEED.length} DeepSeek models`)
}

async function seedOwnerProfile(): Promise<void> {
  const existing = await prisma.siteOwnerProfile.findUnique({
    where: { id: OWNER_PROFILE_ROW_ID },
  })
  if (existing) return

  const profile = getDefaultOwnerProfile()
  await prisma.siteOwnerProfile.create({
    data: {
      id: OWNER_PROFILE_ROW_ID,
      data: JSON.stringify(profile),
    },
  })
  console.log('Seed site owner profile')
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

  await ensureSeedUser({
    username: SEED_ADMIN_USERNAME,
    password: SEED_ADMIN_PASSWORD,
    role: 'admin',
    quotaLimit: 10000,
    proAccess: true,
  })

  await ensureSeedUser({
    username: 'user',
    password: 'user123456',
    role: 'user',
    quotaLimit: 50,
    proAccess: false,
  })

  await seedFeatures()
  await seedProviderFromEnv()
  await seedOwnerProfile()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
