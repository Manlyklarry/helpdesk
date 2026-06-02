import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db.js'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const tickets = await prisma.ticket.findMany({
      select: {
        id: true,
        subject: true,
        status: true,
        category: true,
        fromEmail: true,
        fromName: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(tickets)
  } catch (err) {
    console.error('Failed to fetch tickets:', err)
    return res.status(500).json({ error: 'Failed to load tickets' })
  }
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' })
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    return res.json(ticket)
  } catch (err) {
    console.error('Failed to fetch ticket:', err)
    return res.status(500).json({ error: 'Failed to load ticket' })
  }
})

const statusSchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']),
})

router.patch('/:id/status', async (req, res) => {
  const id = parseInt(req.params.id, 10)
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid status' })
  }

  try {
    const existing = await prisma.ticket.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ error: 'Ticket not found' })

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status: parsed.data.status },
      select: { id: true, status: true },
    })
    return res.json(ticket)
  } catch (err) {
    console.error('Failed to update ticket status:', err)
    return res.status(500).json({ error: 'Failed to update ticket' })
  }
})

export default router
