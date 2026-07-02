import { prisma } from '../db.js'
import { filterModelsForUser } from './modelAccess.js'
import type { UserPublic } from './userDto.js'
import { toFeaturePublic, toModelPublic } from '../lib/catalogDto.js'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function getTodayUsage(userId: string): Promise<number> {
  const row = await prisma.usageDaily.findUnique({
    where: { userId_date: { userId, date: todayKey() } },
  })
  return row?.count ?? 0
}

export async function incrementTodayUsage(userId: string): Promise<number> {
  const date = todayKey()
  const row = await prisma.usageDaily.upsert({
    where: { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  })
  return row.count
}

export async function listEnabledModels() {
  return prisma.aiModel.findMany({
    where: { enabled: true, provider: { enabled: true } },
    orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
  })
}

export async function listEnabledFeatures() {
  return prisma.feature.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })
}

export async function getEnabledModelById(id: string) {
  return prisma.aiModel.findFirst({
    where: { id, enabled: true, provider: { enabled: true } },
    include: { provider: true },
  })
}

export async function getEnabledFeatureById(id: string) {
  return prisma.feature.findFirst({ where: { id, enabled: true } })
}

export async function listEnabledModelsForUser(user?: UserPublic) {
  const models = await listEnabledModels()
  return filterModelsForUser(models, user)
}

export function mapModelsPublic(models: Awaited<ReturnType<typeof listEnabledModels>>) {
  return models.map(toModelPublic)
}

export function mapFeaturesPublic(features: Awaited<ReturnType<typeof listEnabledFeatures>>) {
  return features.map(toFeaturePublic)
}
