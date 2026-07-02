import { Router } from 'express'
import { prisma } from '../db.js'
import { sendError } from '../lib/errors.js'
import {
  getDefaultOwnerProfile,
  normalizeOwnerProfile,
  OWNER_PROFILE_ROW_ID,
  toOwnerProfileResponse,
  type OwnerProfile,
} from '../lib/ownerProfileDto.js'
import { requireAdmin } from '../middleware/auth.js'

export const siteRouter = Router()

siteRouter.get('/owner-profile', async (_req, res) => {
  const row = await prisma.siteOwnerProfile.findUnique({
    where: { id: OWNER_PROFILE_ROW_ID },
  })
  if (!row) {
    res.json(getDefaultOwnerProfile())
    return
  }
  res.json(toOwnerProfileResponse(row))
})

siteRouter.put('/owner-profile', requireAdmin, async (req, res) => {
  const profile = normalizeOwnerProfile(req.body)
  if (!profile) {
    sendError(res, 400, 'VALIDATION_ERROR', '主人资料格式不正确，请检查昵称与总体介绍')
    return
  }

  const row = await prisma.siteOwnerProfile.upsert({
    where: { id: OWNER_PROFILE_ROW_ID },
    create: {
      id: OWNER_PROFILE_ROW_ID,
      data: JSON.stringify(profile satisfies OwnerProfile),
    },
    update: {
      data: JSON.stringify(profile),
    },
  })

  res.json(toOwnerProfileResponse(row))
})
