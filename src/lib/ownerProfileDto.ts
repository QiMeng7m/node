import type { SiteOwnerProfile } from '@prisma/client'

export const OWNER_PROFILE_ROW_ID = 'default'

export type OwnerFact = {
  id: string
  topic: string
  content: string
}

export type OwnerProfile = {
  version: 1
  nicknames: string[]
  realName?: string
  title: string
  summary: string
  facts: OwnerFact[]
  updatedAt: number
}

export function getDefaultOwnerProfile(): OwnerProfile {
  const now = Date.now()
  return {
    version: 1,
    nicknames: ['柒梦'],
    realName: '王鸿博',
    title: '主人',
    summary:
      '王鸿博是「柒梦的小破站」的站主，常用网名柒梦。本站由主人搭建，我是 AI 助手小柒，在这里帮访客聊天答疑。',
    facts: [
      {
        id: 'call',
        topic: '称呼',
        content: '可称「柒梦」「王鸿博」或「主人」。',
      },
      {
        id: 'site',
        topic: '站点',
        content: '柒梦的小破站是王鸿博的个人 AI 对话站点。',
      },
    ],
    updatedAt: now,
  }
}

export function normalizeOwnerProfile(input: unknown): OwnerProfile | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  if (raw.version !== 1) return null

  const nicknames = Array.isArray(raw.nicknames)
    ? raw.nicknames.filter((n): n is string => typeof n === 'string').map((n) => n.trim()).filter(Boolean)
    : []
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : '主人'
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''
  if (!nicknames.length || !summary) return null

  const realName =
    typeof raw.realName === 'string' && raw.realName.trim() ? raw.realName.trim() : undefined

  const facts: OwnerFact[] = []
  if (Array.isArray(raw.facts)) {
    for (const item of raw.facts) {
      if (!item || typeof item !== 'object') continue
      const fact = item as Record<string, unknown>
      const topic = typeof fact.topic === 'string' ? fact.topic.trim() : ''
      const content = typeof fact.content === 'string' ? fact.content.trim() : ''
      if (!topic || !content) continue
      const id =
        typeof fact.id === 'string' && fact.id.trim()
          ? fact.id.trim()
          : `fact-${facts.length + 1}`
      facts.push({ id, topic, content })
    }
  }

  return {
    version: 1,
    nicknames,
    realName,
    title,
    summary,
    facts,
    updatedAt: Date.now(),
  }
}

export function parseOwnerProfileJson(raw: string): OwnerProfile {
  try {
    const parsed = normalizeOwnerProfile(JSON.parse(raw))
    if (parsed) return parsed
  } catch {
    // fall through
  }
  return getDefaultOwnerProfile()
}

export function toOwnerProfileResponse(row: SiteOwnerProfile): OwnerProfile {
  return parseOwnerProfileJson(row.data)
}
