import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'

const router = Router()

// Public routes
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// All routes below require authentication
router.use(requireAuth)

export default router
