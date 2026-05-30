import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { prisma } from '../lib/db.js'
import { createUser, updateUser, deleteUser } from '../lib/user-manager.js'

const router = Router()

const createUserSchema = z.object({
  name: z.string().trim().min(3, { error: 'Name must be at least 3 characters' }),
  email: z.string().trim().toLowerCase().email({ error: 'Invalid email address' }),
  password: z.string().trim().min(8, { error: 'Password must be at least 8 characters' }).refine((v) => !/\s/.test(v), { message: 'Password must not contain spaces' }),
  role: z.enum(['admin', 'agent']).default('agent'),
})

const updateUserSchema = z.object({
  name: z.string().trim().min(3, { error: 'Name must be at least 3 characters' }),
  email: z.string().trim().toLowerCase().email({ error: 'Invalid email address' }),
  role: z.enum(['admin', 'agent']),
  password: z.string().trim()
    .min(8, { error: 'Password must be at least 8 characters' })
    .refine((v) => !/\s/.test(v), { message: 'Password must not contain spaces' })
    .optional(),
})

router.get('/', requireAdmin, async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(users)
  } catch (err) {
    console.error('Failed to fetch users:', err)
    res.status(500).json({ error: 'Failed to load users' })
  }
})

router.post('/', requireAdmin, async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return res.status(400).json({ error: message })
  }

  const { name, email, password, role } = parsed.data

  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'A user with that email already exists' })

    const user = await createUser(name, email, password, role)
    return res.status(201).json(user)
  } catch (err) {
    console.error('Failed to create user:', err)
    return res.status(500).json({ error: 'Failed to create user' })
  }
})

router.patch('/:id', requireAdmin, async (req, res) => {
  const parsed = updateUserSchema.safeParse(req.body)
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? 'Invalid request'
    return res.status(400).json({ error: message })
  }

  const { name, email, role, password } = parsed.data
  const id = String(req.params.id)

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'User not found' })

    if (email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({ where: { email } })
      if (emailTaken) return res.status(409).json({ error: 'A user with that email already exists' })
    }

    const user = await updateUser(id, { name, email, role, password })
    return res.json(user)
  } catch (err) {
    console.error('Failed to update user:', err)
    return res.status(500).json({ error: 'Failed to update user' })
  }
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const id = String(req.params.id)

  try {
    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing || existing.deletedAt) return res.status(404).json({ error: 'User not found' })
    if (existing.role === 'admin') return res.status(403).json({ error: 'Admin users cannot be deleted' })

    await deleteUser(id)
    return res.json({ success: true })
  } catch (err) {
    console.error('Failed to delete user:', err)
    return res.status(500).json({ error: 'Failed to delete user' })
  }
})

export default router
