import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { prisma } from '../lib/db.js'
import { createUser } from '../lib/user-manager.js'

const router = Router()

const createUserSchema = z.object({
  name: z.string().trim().min(3, { error: 'Name must be at least 3 characters' }),
  email: z.string().trim().toLowerCase().email({ error: 'Invalid email address' }),
  password: z.string().trim().min(8, { error: 'Password must be at least 8 characters' }).refine((v) => !/\s/.test(v), { message: 'Password must not contain spaces' }),
  role: z.enum(['admin', 'agent']).default('agent'),
})

router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  res.json(users)
})

router.post('/', requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return res.status(400).json({ error: message })
  }

  const { name, email, password, role } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return res.status(409).json({ error: 'A user with that email already exists' })
  }

  try {
    const user = await createUser(name, email, password, role)
    return res.status(201).json(user)
  } catch (err) {
    console.error('Failed to create user:', err)
    return res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
