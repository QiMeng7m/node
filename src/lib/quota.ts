import { prisma } from '../db.js'

function readLimit(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

export function getIpChatLimit(): number {
  return readLimit('IP_CHAT_LIMIT', 200)
}

export function getIpRegisterLimit(): number {
  return readLimit('IP_REGISTER_LIMIT', 3)
}

export const QUOTA_EXCEEDED_MESSAGE = '配额已用完，请联系管理员开通更多额度'
export const IP_CHAT_EXCEEDED_MESSAGE = '当前网络请求次数已达上限，请联系管理员'

export async function getIpQuota(ip: string) {
  return prisma.ipQuota.findUnique({ where: { ip } })
}

export async function assertIpRegisterAllowed(ip: string): Promise<string | null> {
  const limit = getIpRegisterLimit()
  if (limit <= 0) return null

  const row = await getIpQuota(ip)
  if ((row?.registerCount ?? 0) >= limit) {
    return `该网络注册次数已达上限（${limit} 次），请联系管理员开通账号`
  }
  return null
}

export async function incrementIpRegisterCount(ip: string): Promise<void> {
  await prisma.ipQuota.upsert({
    where: { ip },
    create: { ip, registerCount: 1, chatCount: 0 },
    update: { registerCount: { increment: 1 } },
  })
}

export async function assertIpChatAllowed(ip: string): Promise<string | null> {
  const limit = getIpChatLimit()
  if (limit <= 0) return null

  const row = await getIpQuota(ip)
  if ((row?.chatCount ?? 0) >= limit) {
    return IP_CHAT_EXCEEDED_MESSAGE
  }
  return null
}

export async function incrementIpChatCount(ip: string): Promise<void> {
  await prisma.ipQuota.upsert({
    where: { ip },
    create: { ip, chatCount: 1, registerCount: 0 },
    update: { chatCount: { increment: 1 } },
  })
}

export function assertUserQuotaAllowed(quotaUsed: number, quotaLimit: number): string | null {
  if (quotaUsed >= quotaLimit) {
    return QUOTA_EXCEEDED_MESSAGE
  }
  return null
}

export async function incrementUserQuotaUsed(userId: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { quotaUsed: { increment: 1 } },
    select: { quotaUsed: true, quotaLimit: true },
  })
  return user.quotaUsed
}

export function quotaRemaining(quotaUsed: number, quotaLimit: number): number {
  return Math.max(0, quotaLimit - quotaUsed)
}
