import type { AiModel, Feature } from '@prisma/client'

export type ModelTag = 'fast' | 'strong' | 'code' | 'vision' | 'cheap'
export type CostTier = 'free' | 'low' | 'high'
export type FeatureCategory = 'chat' | 'code' | 'doc' | 'image' | 'other'
export type ModelPolicy = 'locked' | 'recommended' | 'free'

export interface ModelPublic {
  id: string
  label: string
  description?: string
  tags: ModelTag[]
  supportsVision: boolean
  supportsStream: boolean
  costTier: CostTier
  recommended?: boolean
}

export interface UiField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number'
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
}

export interface UiSchema {
  type: 'plain' | 'form'
  fields?: UiField[]
}

export interface FeaturePublic {
  id: string
  name: string
  description: string
  icon?: string
  category: FeatureCategory
  modelPolicy: ModelPolicy
  defaultModelId?: string
  uiSchema?: UiSchema
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function toModelPublic(model: AiModel): ModelPublic {
  const tags = parseJson<ModelTag[]>(model.tags, [])
  return {
    id: model.id,
    label: model.label,
    description: model.description ?? undefined,
    tags,
    supportsVision: model.supportsVision,
    supportsStream: model.supportsStream,
    costTier: model.costTier as CostTier,
    recommended: model.recommended || undefined,
  }
}

export function toFeaturePublic(feature: Feature): FeaturePublic {
  const uiSchema = parseJson<UiSchema>(feature.uiSchema, { type: 'plain' })
  return {
    id: feature.id,
    name: feature.name,
    description: feature.description,
    icon: feature.icon ?? undefined,
    category: feature.category as FeatureCategory,
    modelPolicy: feature.modelPolicy as ModelPolicy,
    defaultModelId: feature.defaultModelId ?? undefined,
    uiSchema: uiSchema.type === 'plain' && !uiSchema.fields?.length ? undefined : uiSchema,
  }
}
