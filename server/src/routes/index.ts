import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import usersRouter from './users.js'
import webhooksRouter from './webhooks.js'
import ticketsRouter from './tickets.js'
import dashboardRouter from './dashboard.js'
import eventsRouter from './events.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Webhooks must be before requireAuth — no session from email providers
router.use('/webhooks', webhooksRouter)

router.use(requireAuth)

router.use('/users', usersRouter)
router.use('/tickets', ticketsRouter)
router.use('/dashboard', dashboardRouter)
router.use('/events', eventsRouter)

export default router
