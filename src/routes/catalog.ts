import { Router } from 'express'
import {
  listEnabledFeatures,
  listEnabledModelsForUser,
  mapFeaturesPublic,
  mapModelsPublic,
} from '../lib/catalog.js'
import { optionalAuth, type AuthedRequest } from '../middleware/auth.js'

export const catalogRouter = Router()

catalogRouter.use(optionalAuth)

catalogRouter.get('/models', async (req: AuthedRequest, res) => {
  const models = await listEnabledModelsForUser(req.user)
  res.json({ items: mapModelsPublic(models) })
})

catalogRouter.get('/features', async (_req, res) => {
  const features = await listEnabledFeatures()
  res.json({ items: mapFeaturesPublic(features) })
})
