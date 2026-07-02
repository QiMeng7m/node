/**
 * 批量向线上 Admin API 同步 DeepSeek 模型（与 prisma/seed.ts MODEL_SEED 一致）
 */

const MODELS = [
  {
    upstreamModelId: 'deepseek-v4-flash',
    label: 'DeepSeek V4 Flash',
    description: '快速响应，所有用户可用',
    tags: ['fast'],
    costTier: 'low',
    sortOrder: 0,
    requiresPermission: false,
  },
  {
    upstreamModelId: 'deepseek-v4-pro',
    label: 'DeepSeek V4 Pro',
    description: '旗舰推理，需管理员授权',
    tags: ['strong'],
    costTier: 'high',
    sortOrder: 1,
    requiresPermission: true,
  },
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
    const err = body as ApiError
    throw new Error(err?.error?.message ?? `HTTP ${response.status}`)
  }

  return body as T
}

async function login(baseUrl: string, username: string, password: string): Promise<string> {
  const res = await api<{ accessToken: string }>(baseUrl, '/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  return res.accessToken
}

async function findProviderId(
  baseUrl: string,
  token: string,
  providerId?: string,
  providerName?: string,
): Promise<string> {
  if (providerId?.trim()) return providerId.trim()

  const { items } = await api<{ items: { id: string; name: string }[] }>(
    baseUrl,
    '/api/admin/providers',
    { token },
  )

  if (providerName) {
    const match = items.find((p) => p.name === providerName)
    if (match) return match.id
  }

  if (items.length === 1) return items[0]!.id
  throw new Error('请设置 PROVIDER_ID 或 PROVIDER_NAME（如 DeepSeek）')
}

async function main() {
  const baseUrl = process.env.API_BASE_URL?.trim()
  const username = process.env.ADMIN_USERNAME?.trim()
  const password = process.env.ADMIN_PASSWORD?.trim()
  const dryRun = process.env.DRY_RUN === '1'
  const skipExisting = process.env.SKIP_EXISTING !== '0'
  const providerId = process.env.PROVIDER_ID?.trim()
  const providerName = process.env.PROVIDER_NAME?.trim() || 'DeepSeek'

  if (!baseUrl || !username || !password) {
    console.error('请配置 API_BASE_URL、ADMIN_USERNAME、ADMIN_PASSWORD')
    process.exit(1)
  }

  const token = await login(baseUrl, username, password)
  const resolvedProviderId = await findProviderId(baseUrl, token, providerId, providerName)

  const existing = await api<{ items: { modelId: string }[] }>(baseUrl, '/api/admin/models', {
    token,
  })
  const existingIds = new Set(existing.items.map((m) => m.modelId))

  for (const model of MODELS) {
    if (skipExisting && existingIds.has(model.upstreamModelId)) {
      console.log(`跳过已存在: ${model.upstreamModelId}`)
      continue
    }

    const payload = {
      providerId: resolvedProviderId,
      modelId: model.upstreamModelId,
      label: model.label,
      description: model.description,
      tags: model.tags,
      supportsVision: false,
      costTier: model.costTier,
      enabled: true,
      sortOrder: model.sortOrder,
      requiresPermission: model.requiresPermission,
    }

    if (dryRun) {
      console.log('[DRY_RUN] 将创建:', payload)
      continue
    }

    await api(baseUrl, '/api/admin/models', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    })
    console.log(`已创建: ${model.upstreamModelId}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
