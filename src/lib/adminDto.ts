import type { AiModel, Feature, Provider } from '@prisma/client'
import { toFeaturePublic } from './catalogDto.js'

export function maskApiKey(key: string): string {
  if (!key) return '—'
  if (key.length <= 8) return '****'
  return `${key.slice(0, 3)}-****${key.slice(-4)}`
}

export function toProviderAdmin(provider: Provider) {
  return {
    id: provider.id,
    name: provider.name,
    type: provider.protocol === 'anthropic' ? 'anthropic' : 'openai-compat',
    baseURL: provider.baseUrl,
    enabled: provider.enabled,
    apiKeyMasked: maskApiKey(provider.apiKey),
    createdAt: provider.createdAt.toISOString(),
  }
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function toModelAdmin(model: AiModel) {
  return {
    id: model.id,
    providerId: model.providerId,
    modelId: model.upstreamModelId,
    label: model.label,
    description: model.description ?? undefined,
    tags: parseJson<string[]>(model.tags, []),
    supportsVision: model.supportsVision,
    costTier: model.costTier,
    requiresPermission: model.requiresPermission,
    enabled: model.enabled,
    sortOrder: model.sortOrder,
  }
}

export function toFeatureAdmin(feature: Feature) {
  return {
    ...toFeaturePublic(feature),
    systemPrompt: feature.systemPrompt,
    enabled: feature.enabled,
    sortOrder: feature.sortOrder,
  }
}

export function slugifyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'provider'
}
