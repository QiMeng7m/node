import { Router } from 'express'
import { listEnabledFeatures, listEnabledModels, mapFeaturesPublic, mapModelsPublic } from '../lib/catalog.js'
import { optionalAuth } from '../middleware/auth.js'

export const catalogRouter = Router()

catalogRouter.use(optionalAuth)

catalogRouter.get('/models', async (_req, res) => {
  const models = await listEnabledModels()
  res.json({ items: mapModelsPublic(models) })
})

catalogRouter.get('/features', async (_req, res) => {
  const features = await listEnabledFeatures()
  res.json({ items: mapFeaturesPublic(features) })
})
