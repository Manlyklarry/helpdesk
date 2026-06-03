import { Router, type Response } from 'express'
import { z } from 'zod'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { prisma } from '../lib/db.js'
import { firstZodError } from '../lib/zod.js'
import { parseIntParam } from '../lib/http.js'
import { extractFirstName, buildPolishSystem } from '../lib/ai.js'

const router = Router()

async function findTicketOr404(id: number, res: Response): Promise<boolean> {
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return false
  }
  return true
}

const SORTABLE_FIELDS = ['createdAt', 'subject', 'fromName', 'status', 'category'] as const

const PAGE_SIZE = 10

const listQuerySchema = z.object({
  sortBy: z.enum(SORTABLE_FIELDS).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  category: z.enum(['general', 'technical', 'refund', 'none']).optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(PAGE_SIZE),
})

router.get('/', async (req, res) => {
  const result = listQuerySchema.safeParse(req.query)
  const { sortBy, sortDir, status, category, search, page, pageSize } = result.success
    ? result.data
    : { sortBy: 'createdAt' as const, sortDir: 'desc' as const, status: undefined, category: undefined, search: undefined, page: 1, pageSize: PAGE_SIZE }

  const where = {
    ...(status ? { status } : {}),
    ...(category === 'none' ? { category: null } : category ? { category } : {}),
    ...(search ? {
      OR: [
        { subject:   { contains: search, mode: 'insensitive' as const } },
        { fromName:  { contains: search, mode: 'insensitive' as const } },
        { fromEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

  const select = {
    id: true,
    subject: true,
    status: true,
    category: true,
    fromEmail: true,
    fromName: true,
    createdAt: true,
    updatedAt: true,
    _count: { select: { messages: true } },
    assignedAgent: { select: { id: true, name: true, email: true } },
  }

  try {
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        select,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ticket.count({ where }),
    ])
    return res.json({ data: tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
  } catch (err) {
    console.error('Failed to fetch tickets:', err)
    return res.status(500).json({ error: 'Failed to load tickets' })
  }
})

router.get('/:id', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        assignedAgent: { select: { id: true, name: true, email: true } },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    return res.json(ticket)
  } catch (err) {
    console.error('Failed to fetch ticket:', err)
    return res.status(500).json({ error: 'Failed to load ticket' })
  }
})

const assignSchema = z.object({
  agentId: z.string().nullable(),
})

router.patch('/:id/assign', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = assignSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstZodError(parsed.error, 'Invalid agent ID') })

  try {
    if (!await findTicketOr404(id, res)) return

    if (parsed.data.agentId !== null) {
      const agent = await prisma.user.findUnique({ where: { id: parsed.data.agentId, deletedAt: null } })
      if (!agent) return res.status(404).json({ error: 'Agent not found' })
    }

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { assignedAgentId: parsed.data.agentId },
      select: { id: true, assignedAgent: { select: { id: true, name: true, email: true } } },
    })
    return res.json(ticket)
  } catch (err) {
    console.error('Failed to assign ticket:', err)
    return res.status(500).json({ error: 'Failed to assign ticket' })
  }
})

const replySchema = z.object({
  body: z.string().trim().min(1, { message: 'Reply cannot be empty' }).max(50_000, { message: 'Reply is too long' }),
})

router.post('/:id/messages', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstZodError(parsed.error, 'Invalid reply') })

  const agent = req.user!

  try {
    if (!await findTicketOr404(id, res)) return

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        messageId: `reply-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        direction: 'outbound',
        senderType: 'agent',
        fromEmail: agent.email,
        fromName: agent.name,
        body: parsed.data.body,
      },
    })
    return res.status(201).json(message)
  } catch (err) {
    console.error('Failed to add reply:', err)
    return res.status(500).json({ error: 'Failed to send reply' })
  }
})

router.post('/:id/polish-reply', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = replySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstZodError(parsed.error, 'Invalid body') })

  try {
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { fromName: true } })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    const agent = req.user!
    const customerFirstName = extractFirstName(ticket.fromName)

    const { text } = await generateText({
      model: openai('gpt-5-nano'),
      system: buildPolishSystem(customerFirstName, agent.name),
      prompt: parsed.data.body,
    })
    return res.json({ polished: text })
  } catch (err) {
    console.error('Failed to polish reply:', err)
    return res.status(500).json({ error: 'Failed to polish reply' })
  }
})

const statusSchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']),
})

router.patch('/:id/status', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = statusSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstZodError(parsed.error, 'Invalid status') })

  try {
    if (!await findTicketOr404(id, res)) return

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

const categorySchema = z.object({
  category: z.enum(['general', 'technical', 'refund']).nullable(),
})

router.patch('/:id/category', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })
  const parsed = categorySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: firstZodError(parsed.error, 'Invalid category') })

  try {
    if (!await findTicketOr404(id, res)) return

    const ticket = await prisma.ticket.update({
      where: { id },
      data: { category: parsed.data.category },
      select: { id: true, category: true },
    })
    return res.json(ticket)
  } catch (err) {
    console.error('Failed to update ticket category:', err)
    return res.status(500).json({ error: 'Failed to update ticket' })
  }
})

export default router
