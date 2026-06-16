import { Router, type Response } from 'express'
import { z } from 'zod'
import * as Sentry from '@sentry/node'
import { prisma } from '../lib/db.js'
import { firstZodError } from '../lib/zod.js'
import { parseIntParam } from '../lib/http.js'
import { extractFirstName, polishReply, summarizeTicket } from '../lib/ai.js'
import { sendReply } from '../lib/email.js'

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

  const baseStatusFilter = status
    ? { status }
    : { status: { notIn: ['new' as const, 'processing' as const] } }

  const where = {
    ...baseStatusFilter,
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
    Sentry.captureException(err)
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
    Sentry.captureException(err)
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
    Sentry.captureException(err)
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
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        fromEmail: true,
        fromName: true,
        subject: true,
        messages: {
          where: { direction: 'inbound' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { messageId: true },
        },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })

    const customerFirstName = extractFirstName(ticket.fromName)
    const body = await Promise.race([
      polishReply(parsed.data.body, customerFirstName).catch(() => parsed.data.body),
      new Promise<string>((resolve) => setTimeout(() => resolve(parsed.data.body), 4_000)),
    ])

    const outboundMessageId = `reply-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: id,
        messageId: outboundMessageId,
        direction: 'outbound',
        senderType: 'agent',
        fromEmail: agent.email,
        fromName: agent.name,
        body,
      },
    })

    sendReply({
      to: ticket.fromEmail,
      subject: ticket.subject,
      text: body,
      fromName: agent.name,
      messageId: outboundMessageId,
      inReplyTo: ticket.messages?.[0]?.messageId,
    }).catch((err) => {
      Sentry.captureException(err)
      console.error(`[email] Failed to send reply for ticket #${id}:`, err)
    })

    return res.status(201).json(message)
  } catch (err) {
    Sentry.captureException(err)
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

    const customerFirstName = extractFirstName(ticket.fromName)
    const polished = await polishReply(parsed.data.body, customerFirstName)
    return res.json({ polished })
  } catch (err) {
    Sentry.captureException(err)
    const reason = err instanceof Error ? err.message : String(err)
    console.error('Failed to polish reply:', err)
    return res.status(500).json({ error: `Failed to polish reply: ${reason}` })
  }
})

router.post('/:id/summarize', async (req, res) => {
  const id = parseIntParam(req.params.id)
  if (id === null) return res.status(400).json({ error: 'Invalid ticket ID' })

  try {
    const ticket = await prisma.ticket.findUnique({
      where: { id },
      select: {
        subject: true,
        messages: { select: { senderType: true, fromName: true, body: true }, orderBy: { createdAt: 'asc' } },
      },
    })
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' })
    if (ticket.messages.length === 0) return res.status(422).json({ error: 'No messages to summarize' })

    const summary = await summarizeTicket(ticket.subject, ticket.messages)
    return res.json({ summary })
  } catch (err) {
    Sentry.captureException(err)
    console.error('Failed to summarize ticket:', err)
    return res.status(500).json({ error: 'Failed to summarize ticket' })
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
    Sentry.captureException(err)
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
    Sentry.captureException(err)
    console.error('Failed to update ticket category:', err)
    return res.status(500).json({ error: 'Failed to update ticket' })
  }
})

export default router
