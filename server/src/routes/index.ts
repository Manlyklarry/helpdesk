import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import usersRouter from './users.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use(requireAuth)

router.use('/users', usersRouter)

export default router
