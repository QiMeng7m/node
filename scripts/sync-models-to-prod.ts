/**
 * 批量向线上 Admin API 插入模型（与 prisma/seed.ts MODEL_SEED 一致）
 *
 * 用法（PowerShell）:
 *   $env:API_BASE_URL="https://your-api.com"
 *   $env:ADMIN_EMAIL="admin@example.com"
 *   $env:ADMIN_PASSWORD="your-password"
 *   npx tsx scripts/sync-models-to-prod.ts
 *
 * 可选环境变量:
 *   PROVIDER_ID      线上 Provider 的 id（优先）
 *   PROVIDER_NAME    按名称匹配 Provider（默认 JZ Internal）
 *   DRY_RUN=1        只打印，不实际提交
 *   SKIP_EXISTING=0  已存在同名 upstreamModelId 时仍尝试创建（默认跳过）
 */

const VISION_MODEL_IDS = new Set([
  'default/glm-5.1',
  'default/glm-5.2',
  'default/gpt-5.5',
  'default/claude-opus-4-7',
  'default/claude-opus-4-8',
  'default/claude-sonnet-4-6',
  'default/claude-fable-5',
  'default/kimi-k2.6',
])

/** 与 prisma/seed.ts MODEL_SEED 保持一致 */
const MODELS = [
  { upstreamModelId: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', description: 'DeepSeek 旗舰', tags: ['strong'], costTier: 'high', sortOrder: 0 },
  { upstreamModelId: 'glm-5.1', label: 'GLM 5.1', description: '智谱 GLM 5.1', tags: ['fast'], costTier: 'low', sortOrder: 1 },
  { upstreamModelId: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', description: 'DeepSeek 快速版', tags: ['fast'], costTier: 'low', sortOrder: 2 },
  { upstreamModelId: 'glm-5.2', label: 'GLM 5.2', description: '智谱 GLM 5.2', tags: ['strong'], costTier: 'low', sortOrder: 3 },
  { upstreamModelId: 'mimo-v2.5-pro', label: 'MiMo V2.5 Pro', description: 'MiMo 增强版', tags: ['strong'], costTier: 'low', sortOrder: 4 },
  { upstreamModelId: 'gpt-5.5', label: 'GPT 5.5', description: 'OpenAI GPT 5.5', tags: ['strong'], costTier: 'high', sortOrder: 5 },
  { upstreamModelId: 'glm-5-turbo', label: 'GLM 5 Turbo', description: '智谱 GLM 5 Turbo', tags: ['fast'], costTier: 'low', sortOrder: 6 },
  { upstreamModelId: 'claude-opus-4-7', label: 'Claude Opus 4.7', description: 'Anthropic Opus 4.7', tags: ['strong'], costTier: 'high', sortOrder: 7 },
  { upstreamModelId: 'claude-opus-4-8', label: 'Claude Opus 4.8', description: 'Anthropic Opus 4.8', tags: ['strong'], costTier: 'high', sortOrder: 8 },
  { upstreamModelId: 'MiniMax-M2.7-highspeed', label: 'MiniMax M2.7 Highspeed', description: 'MiniMax 高速版', tags: ['fast'], costTier: 'low', sortOrder: 9 },
  { upstreamModelId: 'mimo-v2.5', label: 'MiMo V2.5', description: 'MiMo 标准版', tags: ['fast'], costTier: 'low', sortOrder: 10 },
  { upstreamModelId: 'kimi-k2.6', label: 'Kimi K2.6', description: 'Kimi 对话模型', tags: ['strong'], costTier: 'low', sortOrder: 11 },
  { upstreamModelId: 'kimi-for-coding', label: 'Kimi for Coding', description: 'Kimi 代码专用', tags: ['code'], costTier: 'low', sortOrder: 12 },
  { upstreamModelId: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', description: 'Anthropic Sonnet 4.6', tags: ['strong'], costTier: 'high', sortOrder: 13 },
  { upstreamModelId: 'glm-4.5-air', label: 'GLM 4.5 Air', description: '智谱 GLM 4.5 Air', tags: ['cheap', 'fast'], costTier: 'low', sortOrder: 14 },
  { upstreamModelId: 'cursor-claude-opus-4-7-max-fast', label: 'Cursor Claude Opus 4.7 Max Fast', description: 'Cursor 代码加速', tags: ['code', 'fast'], costTier: 'high', sortOrder: 15 },
  { upstreamModelId: 'mimo-v2-pro', label: 'MiMo V2 Pro', description: 'MiMo Pro', tags: ['strong'], costTier: 'low', sortOrder: 16 },
  { upstreamModelId: 'MiniMax-M2.7', label: 'MiniMax M2.7', description: 'MiniMax 标准版', tags: ['fast'], costTier: 'low', sortOrder: 17 },
  { upstreamModelId: 'claude-fable-5', label: 'Claude Fable 5', description: 'Anthropic Fable 5', tags: ['strong'], costTier: 'high', sortOrder: 18 },
  { upstreamModelId: 'glm-4.7', label: 'GLM 4.7', description: '智谱 GLM 4.7', tags: ['fast'], costTier: 'low', sortOrder: 19 },
] as const

type ApiError = { error?: { message?: string } }

async function api<T>(
  baseUrl: string,
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...rest } = init
  const headers = new Headers(rest.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
    ...rest,
    headers,
  })

  const text = await response.text()
  let body: unknown = null
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = text
    }
  }

  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'error' in body
        ? (body as ApiError).error?.message
        : typeof body === 'string'
          ? body
          : `HTTP ${response.status}`
    throw new Error(`${path} → ${response.status}: ${message || '请求失败'}`)
  }

  return body as T
}

function env(name: string, required = false): string {
  const value = process.env[name]?.trim() ?? ''
  if (required && !value) {
    throw new Error(`缺少环境变量 ${name}`)
  }
  return value
}

function truthy(name: string, defaultValue = false): boolean {
  const raw = process.env[name]
  if (raw === undefined) return defaultValue
  return raw === '1' || raw.toLowerCase() === 'true'
}

async function main() {
  const baseUrl = env('API_BASE_URL', true)
  const email = env('ADMIN_EMAIL', true)
  const password = env('ADMIN_PASSWORD', true)
  const providerIdEnv = env('PROVIDER_ID')
  const providerName = env('PROVIDER_NAME') || 'JZ Internal'
  const dryRun = truthy('DRY_RUN')
  const skipExisting = truthy('SKIP_EXISTING', true)

  console.log(`目标: ${baseUrl}`)
  console.log(`模式: ${dryRun ? 'DRY RUN（不提交）' : '写入'}`)
  console.log(`已存在: ${skipExisting ? '跳过' : '仍尝试创建'}`)
  console.log('')

  const login = await api<{ accessToken: string }>(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  const token = login.accessToken
  console.log('✓ 登录成功')

  let providerId = providerIdEnv
  if (!providerId) {
    const { items } = await api<{ items: Array<{ id: string; name: string }> }>(
      baseUrl,
      '/api/admin/providers',
      { token },
    )
    const matched = items.filter((p) => p.name === providerName)
    if (matched.length === 1) {
      providerId = matched[0].id
    } else if (items.length === 1) {
      providerId = items[0].id
      console.log(`⚠ 未找到名称 "${providerName}"，使用唯一 Provider: ${items[0].name}`)
    } else {
      console.error(`找不到 Provider（名称: ${providerName}）`)
      console.error('线上 Provider 列表:')
      for (const p of items) console.error(`  - ${p.name}  id=${p.id}`)
      console.error('\n请设置 PROVIDER_ID 或 PROVIDER_NAME')
      process.exit(1)
    }
  }
  console.log(`✓ Provider id: ${providerId}`)

  const { items: existing } = await api<{
    items: Array<{ providerId: string; modelId: string; id: string }>
  }>(baseUrl, '/api/admin/models', { token })

  const existingUpstream = new Set(
    existing.filter((m) => m.providerId === providerId).map((m) => m.modelId),
  )
  console.log(`✓ 线上已有 ${existingUpstream.size} 个模型（该 Provider）`)
  console.log('')

  let created = 0
  let skipped = 0
  let failed = 0

  for (const model of MODELS) {
    const catalogId = `default/${model.upstreamModelId}`
    const supportsVision = VISION_MODEL_IDS.has(catalogId)
    const tags = [...model.tags]
    if (supportsVision && !tags.includes('vision')) tags.push('vision')

    if (skipExisting && existingUpstream.has(model.upstreamModelId)) {
      console.log(`- 跳过 ${model.label} (${model.upstreamModelId})，已存在`)
      skipped += 1
      continue
    }

    const payload = {
      providerId,
      modelId: model.upstreamModelId,
      label: model.label,
      description: model.description,
      tags,
      supportsVision,
      costTier: model.costTier,
      enabled: true,
      sortOrder: model.sortOrder,
    }

    if (dryRun) {
      console.log(`+ [DRY] ${model.label} → default/${model.upstreamModelId}`)
      created += 1
      continue
    }

    try {
      const createdModel = await api<{ id: string; label: string }>(baseUrl, '/api/admin/models', {
        method: 'POST',
        token,
        body: JSON.stringify(payload),
      })
      console.log(`+ 创建 ${createdModel.label} (${createdModel.id})`)
      created += 1
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`✗ 失败 ${model.label}: ${msg}`)
      failed += 1
    }
  }

  console.log('')
  console.log(`完成: 创建 ${created}，跳过 ${skipped}，失败 ${failed}`)
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
