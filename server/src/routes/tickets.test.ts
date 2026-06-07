import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from 'bun:test'
import express from 'express'
import type { Server } from 'http'

// ─── Mocks (must be declared before the router is imported) ──────────────────

const mockTicketFindUnique = mock()
const mockTicketFindMany = mock()
const mockTicketCount = mock()
const mockTicketUpdate = mock()
const mockTicketMessageCreate = mock()
const mockUserFindUnique = mock()

mock.module('../lib/db.js', () => ({
  prisma: {
    ticket: {
      findUnique: mockTicketFindUnique,
      findMany: mockTicketFindMany,
      count: mockTicketCount,
      update: mockTicketUpdate,
    },
    ticketMessage: { create: mockTicketMessageCreate },
    user: { findUnique: mockUserFindUnique },
  },
}))

const mockExtractFirstName = mock()
const mockPolishReply = mock()
const mockSummarizeTicket = mock()

mock.module('../lib/ai.js', () => ({
  extractFirstName: mockExtractFirstName,
  polishReply: mockPolishReply,
  summarizeTicket: mockSummarizeTicket,
}))

mock.module('../lib/email.js', () => ({ sendReply: mock().mockResolvedValue(undefined) }))

const { default: ticketsRouter } = await import('./tickets.js')

// ─── Test server ─────────────────────────────────────────────────────────────

// Inject a fake agent user so POST /:id/messages can access req.user
const agentUser = { id: 'agent-1', name: 'Test Agent', email: 'agent@test.com', role: 'agent' }

const app = express()
app.use(express.json())
app.use((req, _, next) => { (req as any).user = agentUser; next() })
app.use('/tickets', ticketsRouter)

let server: Server
let base: string

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        base = `http://localhost:${(server.address() as { port: number }).port}`
        resolve()
      })
    }),
)

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

beforeEach(() => {
  mockTicketFindUnique.mockReset()
  mockTicketFindMany.mockReset()
  mockTicketCount.mockReset()
  mockTicketUpdate.mockReset()
  mockTicketMessageCreate.mockReset()
  mockUserFindUnique.mockReset()
  mockExtractFirstName.mockReset()
  mockPolishReply.mockReset()
  mockSummarizeTicket.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const get = (path: string) => fetch(`${base}${path}`)
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const patch = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

// ─── GET /tickets ─────────────────────────────────────────────────────────────

describe('GET /tickets', () => {
  it('returns paginated tickets with total, page, and totalPages', async () => {
    const tickets = [{ id: 1, subject: 'Help', status: 'open', fromEmail: 'a@b.com', fromName: 'Alice', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), category: null, _count: { messages: 2 }, assignedAgent: null }]
    mockTicketFindMany.mockResolvedValue(tickets)
    mockTicketCount.mockResolvedValue(1)

    const res = await get('/tickets')
    expect(res.status).toBe(200)
    const body = await res.json() as any
    expect(body.data).toEqual(tickets)
    expect(body.total).toBe(1)
    expect(body.page).toBe(1)
    expect(body.totalPages).toBe(1)
  })

  it('passes status filter to Prisma when provided', async () => {
    mockTicketFindMany.mockResolvedValue([])
    mockTicketCount.mockResolvedValue(0)
    await get('/tickets?status=open')
    expect(mockTicketFindMany.mock.calls[0][0].where).toMatchObject({ status: 'open' })
  })

  it('excludes "new" and "processing" statuses by default', async () => {
    mockTicketFindMany.mockResolvedValue([])
    mockTicketCount.mockResolvedValue(0)
    await get('/tickets')
    const where = mockTicketFindMany.mock.calls[0][0].where
    expect(where.status).toMatchObject({ notIn: ['new', 'processing'] })
  })

  it('returns 500 on database error', async () => {
    mockTicketFindMany.mockRejectedValue(new Error('DB error'))
    const res = await get('/tickets')
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to load tickets')
  })
})

// ─── GET /tickets/:id ─────────────────────────────────────────────────────────

describe('GET /tickets/:id', () => {
  it('returns the full ticket with messages and assigned agent', async () => {
    const ticket = { id: 1, subject: 'Help', messages: [], assignedAgent: null }
    mockTicketFindUnique.mockResolvedValue(ticket)

    const res = await get('/tickets/1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(ticket)
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValue(null)
    const res = await get('/tickets/999')
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 400 for a non-integer ticket ID', async () => {
    const res = await get('/tickets/abc')
    expect(res.status).toBe(400)
    expect((await res.json() as any).error).toBe('Invalid ticket ID')
  })

  it('returns 500 on database error', async () => {
    mockTicketFindUnique.mockRejectedValue(new Error('DB error'))
    const res = await get('/tickets/1')
    expect(res.status).toBe(500)
  })
})

// ─── PATCH /tickets/:id/assign ────────────────────────────────────────────────

describe('PATCH /tickets/:id/assign', () => {
  it('assigns an agent to the ticket', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })   // findTicketOr404
    mockUserFindUnique.mockResolvedValue({ id: 'agent-1', name: 'Alice', deletedAt: null })
    const updated = { id: 1, assignedAgent: { id: 'agent-1', name: 'Alice', email: 'a@t.com' } }
    mockTicketUpdate.mockResolvedValue(updated)

    const res = await patch('/tickets/1/assign', { agentId: 'agent-1' })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
  })

  it('unassigns when agentId is null and skips the agent lookup', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
    mockTicketUpdate.mockResolvedValue({ id: 1, assignedAgent: null })

    const res = await patch('/tickets/1/assign', { agentId: null })
    expect(res.status).toBe(200)
    expect(mockUserFindUnique).not.toHaveBeenCalled()
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValueOnce(null)
    const res = await patch('/tickets/99/assign', { agentId: 'agent-1' })
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 404 when the agent does not exist', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
    mockUserFindUnique.mockResolvedValue(null)
    const res = await patch('/tickets/1/assign', { agentId: 'ghost' })
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Agent not found')
  })

  it('returns 400 for an invalid body (agentId is a number)', async () => {
    const res = await patch('/tickets/1/assign', { agentId: 999 })
    expect(res.status).toBe(400)
  })

  it('returns 400 for a non-integer ticket ID', async () => {
    const res = await patch('/tickets/abc/assign', { agentId: null })
    expect(res.status).toBe(400)
  })
})

// ─── POST /tickets/:id/messages ───────────────────────────────────────────────

describe('POST /tickets/:id/messages', () => {
  it('creates a polished reply and returns 201', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, fromName: 'Jane Smith', fromEmail: 'jane@example.com', subject: 'Help needed', messages: [] })
    mockExtractFirstName.mockReturnValue('Jane')
    mockPolishReply.mockResolvedValue('Dear Jane, thank you for your patience.')
    const savedMsg = { id: 10, body: 'Dear Jane, thank you for your patience.', direction: 'outbound' }
    mockTicketMessageCreate.mockResolvedValue(savedMsg)

    const res = await post('/tickets/1/messages', { body: 'Thanks for reaching out.' })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(savedMsg)
    expect(mockPolishReply).toHaveBeenCalledWith('Thanks for reaching out.', 'Jane')
  })

  it('includes the agent email and name in the saved message', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, fromName: 'Jane', fromEmail: 'jane@example.com', subject: 'Help needed', messages: [] })
    mockExtractFirstName.mockReturnValue('Jane')
    mockPolishReply.mockResolvedValue('Polished')
    mockTicketMessageCreate.mockResolvedValue({ id: 10 })

    await post('/tickets/1/messages', { body: 'Hello' })

    const msgData = mockTicketMessageCreate.mock.calls[0][0].data
    expect(msgData.fromEmail).toBe('agent@test.com')
    expect(msgData.fromName).toBe('Test Agent')
    expect(msgData.direction).toBe('outbound')
    expect(msgData.senderType).toBe('agent')
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValue(null)
    const res = await post('/tickets/1/messages', { body: 'Hello' })
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 400 for an empty body', async () => {
    const res = await post('/tickets/1/messages', { body: '' })
    expect(res.status).toBe(400)
    expect((await res.json() as any).error).toBe('Reply cannot be empty')
  })

  it('returns 500 on database error', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, fromName: 'Jane', fromEmail: 'jane@example.com', subject: 'Help needed', messages: [] })
    mockExtractFirstName.mockReturnValue('Jane')
    mockPolishReply.mockResolvedValue('Polished')
    mockTicketMessageCreate.mockRejectedValue(new Error('DB error'))
    const res = await post('/tickets/1/messages', { body: 'Hello' })
    expect(res.status).toBe(500)
  })
})

// ─── POST /tickets/:id/polish-reply ──────────────────────────────────────────

describe('POST /tickets/:id/polish-reply', () => {
  it('returns the polished reply without saving it', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, fromName: 'Alice' })
    mockExtractFirstName.mockReturnValue('Alice')
    mockPolishReply.mockResolvedValue('Polished reply here.')

    const res = await post('/tickets/1/polish-reply', { body: 'Draft reply' })
    expect(res.status).toBe(200)
    expect((await res.json() as any).polished).toBe('Polished reply here.')
    expect(mockTicketMessageCreate).not.toHaveBeenCalled()
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValue(null)
    const res = await post('/tickets/1/polish-reply', { body: 'draft' })
    expect(res.status).toBe(404)
  })

  it('returns 400 for a whitespace-only body', async () => {
    const res = await post('/tickets/1/polish-reply', { body: '   ' })
    expect(res.status).toBe(400)
  })

  it('returns 500 on AI or database error', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, fromName: 'Alice' })
    mockExtractFirstName.mockReturnValue('Alice')
    mockPolishReply.mockRejectedValue(new Error('AI timeout'))
    const res = await post('/tickets/1/polish-reply', { body: 'draft' })
    expect(res.status).toBe(500)
  })
})

// ─── POST /tickets/:id/summarize ─────────────────────────────────────────────

describe('POST /tickets/:id/summarize', () => {
  it('returns the AI-generated summary', async () => {
    mockTicketFindUnique.mockResolvedValue({
      id: 1,
      subject: 'Login issue',
      messages: [{ senderType: 'customer', fromName: 'Bob', body: 'I cannot log in.' }],
    })
    mockSummarizeTicket.mockResolvedValue('• Customer cannot log in')

    const res = await post('/tickets/1/summarize', {})
    expect(res.status).toBe(200)
    expect((await res.json() as any).summary).toBe('• Customer cannot log in')
  })

  it('returns 422 when the ticket has no messages', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Empty', messages: [] })
    const res = await post('/tickets/1/summarize', {})
    expect(res.status).toBe(422)
    expect((await res.json() as any).error).toBe('No messages to summarize')
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValue(null)
    const res = await post('/tickets/1/summarize', {})
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 500 on AI error', async () => {
    mockTicketFindUnique.mockResolvedValue({ id: 1, subject: 'S', messages: [{ senderType: 'customer', fromName: 'A', body: 'B' }] })
    mockSummarizeTicket.mockRejectedValue(new Error('AI error'))
    const res = await post('/tickets/1/summarize', {})
    expect(res.status).toBe(500)
  })
})

// ─── PATCH /tickets/:id/status ────────────────────────────────────────────────

describe('PATCH /tickets/:id/status', () => {
  it('updates the ticket status', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })  // findTicketOr404
    mockTicketUpdate.mockResolvedValue({ id: 1, status: 'resolved' })

    const res = await patch('/tickets/1/status', { status: 'resolved' })
    expect(res.status).toBe(200)
    expect((await res.json() as any).status).toBe('resolved')
  })

  it('accepts all valid status values: open, resolved, closed', async () => {
    for (const status of ['open', 'resolved', 'closed']) {
      mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
      mockTicketUpdate.mockResolvedValue({ id: 1, status })
      const res = await patch('/tickets/1/status', { status })
      expect(res.status).toBe(200)
    }
  })

  it('returns 400 for an invalid status value', async () => {
    const res = await patch('/tickets/1/status', { status: 'pending' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValueOnce(null)
    const res = await patch('/tickets/99/status', { status: 'open' })
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 400 for a non-integer ticket ID', async () => {
    const res = await patch('/tickets/abc/status', { status: 'open' })
    expect(res.status).toBe(400)
  })
})

// ─── PATCH /tickets/:id/category ─────────────────────────────────────────────

describe('PATCH /tickets/:id/category', () => {
  it('updates the ticket category', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
    mockTicketUpdate.mockResolvedValue({ id: 1, category: 'technical' })

    const res = await patch('/tickets/1/category', { category: 'technical' })
    expect(res.status).toBe(200)
    expect((await res.json() as any).category).toBe('technical')
  })

  it('sets category to null when null is passed', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
    mockTicketUpdate.mockResolvedValue({ id: 1, category: null })

    const res = await patch('/tickets/1/category', { category: null })
    expect(res.status).toBe(200)
    expect((await res.json() as any).category).toBeNull()
    expect(mockTicketUpdate.mock.calls[0][0].data.category).toBeNull()
  })

  it('accepts all valid category values: general, technical, refund', async () => {
    for (const category of ['general', 'technical', 'refund']) {
      mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
      mockTicketUpdate.mockResolvedValue({ id: 1, category })
      const res = await patch('/tickets/1/category', { category })
      expect(res.status).toBe(200)
    }
  })

  it('returns 400 for an unrecognised category value', async () => {
    const res = await patch('/tickets/1/category', { category: 'unknown' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the ticket does not exist', async () => {
    mockTicketFindUnique.mockResolvedValueOnce(null)
    const res = await patch('/tickets/99/category', { category: 'general' })
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('Ticket not found')
  })

  it('returns 500 on database error', async () => {
    mockTicketFindUnique.mockResolvedValueOnce({ id: 1 })
    mockTicketUpdate.mockRejectedValue(new Error('DB error'))
    const res = await patch('/tickets/1/category', { category: 'general' })
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to update ticket')
  })
})
