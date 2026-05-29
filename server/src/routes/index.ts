import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { prisma } from '../lib/db.js'
import { createUser } from '../lib/user-manager.js'

const router = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

router.use(requireAuth)

router.get('/users', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

router.post('/users', requireAdmin, async (req, res) => {
  const { name, email, password, role } = req.body

  if (!name || typeof name !== 'string' || name.trim().length < 3) {
    return res.status(400).json({ error: 'Name must be at least 3 characters' })
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address' })
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const normalizedEmail = email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return res.status(409).json({ error: 'A user with that email already exists' })
  }

  try {
    const user = await createUser(
      name.trim(),
      normalizedEmail,
      password,
      role === 'admin' ? 'admin' : 'agent',
    )
    return res.status(201).json(user)
  } catch (err) {
    console.error('Failed to create user:', err)
    return res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
