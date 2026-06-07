import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from 'bun:test'
import express from 'express'
import type { Server } from 'http'

// ─── Mocks (must be declared before the router is imported) ──────────────────

const mockTicketMessageFindUnique = mock()
const mockTicketMessageCreate = mock()
const mockTicketCreate = mock()
const mockTicketUpdate = mock()
const mockTransaction = mock()

mock.module('../lib/db.js', () => ({
  prisma: {
    ticketMessage: { findUnique: mockTicketMessageFindUnique, create: mockTicketMessageCreate },
    ticket: { create: mockTicketCreate, update: mockTicketUpdate },
    $transaction: mockTransaction,
  },
}))

const mockBossSend = mock()
mock.module('../lib/boss.js', () => ({ boss: { send: mockBossSend } }))

const mockGetAiAgentId = mock()
mock.module('../lib/workers.js', () => ({
  CLASSIFY_QUEUE: 'classify-ticket',
  AUTO_RESOLVE_QUEUE: 'auto-resolve-ticket',
  getAiAgentId: mockGetAiAgentId,
}))

const { default: webhooksRouter } = await import('./webhooks.js')

// ─── Test server ─────────────────────────────────────────────────────────────

const app = express()
app.use('/webhooks', webhooksRouter)

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
  mockTicketMessageFindUnique.mockReset()
  mockTicketMessageCreate.mockReset()
  mockTicketCreate.mockReset()
  mockTicketUpdate.mockReset()
  mockTransaction.mockReset()
  mockBossSend.mockReset()
  mockGetAiAgentId.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makePayload(overrides: {
  from?: string
  to?: string
  subject?: string
  text?: string
  html?: string
  messageId?: string
  inReplyTo?: string
} = {}) {
  const {
    from = 'Jane Doe <jane@example.com>',
    to = 'support@inbound.caregateghana.com',
    subject = 'Test subject',
    text = 'Test email body',
    html = '',
    messageId = 'msg-001@mail.example.com',
    inReplyTo = '',
  } = overrides

  const fd = new FormData()
  fd.append('from', from)
  fd.append('to', to)
  fd.append('subject', subject)
  fd.append('text', text)
  if (html) fd.append('html', html)

  let rawHeaders = `Message-ID: <${messageId}>\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}`
  if (inReplyTo) rawHeaders += `\nIn-Reply-To: <${inReplyTo}>`
  fd.append('headers', rawHeaders)

  return fd
}

function post(fd: FormData) {
  return fetch(`${base}/webhooks/sendgrid`, { method: 'POST', body: fd })
}

// ─── New ticket ───────────────────────────────────────────────────────────────

describe('POST /webhooks/sendgrid — new ticket', () => {
  it('creates a ticket and queues classify + auto-resolve jobs', async () => {
    mockGetAiAgentId.mockResolvedValue('ai-agent-id')
    mockTicketCreate.mockResolvedValue({ id: 99 })
    mockBossSend.mockResolvedValue(undefined)

    const res = await post(makePayload())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(mockTicketCreate).toHaveBeenCalledTimes(1)
    const { data } = mockTicketCreate.mock.calls[0][0]
    expect(data.subject).toBe('Test subject')
    expect(data.fromEmail).toBe('jane@example.com')
    expect(data.fromName).toBe('Jane Doe')
    expect(data.assignedAgentId).toBe('ai-agent-id')

    expect(mockBossSend).toHaveBeenCalledTimes(2)
    const [classify, autoResolve] = mockBossSend.mock.calls
    expect(classify[0]).toBe('classify-ticket')
    expect(classify[1]).toMatchObject({ ticketId: 99, subject: 'Test subject' })
    expect(autoResolve[0]).toBe('auto-resolve-ticket')
    expect(autoResolve[1]).toMatchObject({ ticketId: 99, fromName: 'Jane Doe' })
  })

  it('strips angle brackets from Message-ID in the headers string', async () => {
    mockGetAiAgentId.mockResolvedValue(null)
    mockTicketCreate.mockResolvedValue({ id: 100 })
    mockBossSend.mockResolvedValue(undefined)

    await post(makePayload({ messageId: 'unique-abc@mail.example.com' }))

    const msgCreate = mockTicketCreate.mock.calls[0][0].data.messages.create
    expect(msgCreate.messageId).toBe('unique-abc@mail.example.com')
  })

  it('parses bare email address (no display name) in from field', async () => {
    mockGetAiAgentId.mockResolvedValue(null)
    mockTicketCreate.mockResolvedValue({ id: 101 })
    mockBossSend.mockResolvedValue(undefined)

    await post(makePayload({ from: 'plain@example.com' }))

    const { data } = mockTicketCreate.mock.calls[0][0]
    expect(data.fromEmail).toBe('plain@example.com')
    expect(data.fromName).toBe('plain@example.com')
  })

  it('assigns the AI agent when getAiAgentId returns null', async () => {
    mockGetAiAgentId.mockResolvedValue(null)
    mockTicketCreate.mockResolvedValue({ id: 102 })
    mockBossSend.mockResolvedValue(undefined)

    await post(makePayload())

    const { data } = mockTicketCreate.mock.calls[0][0]
    expect(data.assignedAgentId).toBeNull()
  })

  it('passes text truncated to 2000 chars in the classify job', async () => {
    mockGetAiAgentId.mockResolvedValue(null)
    mockTicketCreate.mockResolvedValue({ id: 103 })
    mockBossSend.mockResolvedValue(undefined)

    const longText = 'x'.repeat(5_000)
    await post(makePayload({ text: longText }))

    const classifyArg = mockBossSend.mock.calls[0][1]
    expect(classifyArg.text.length).toBe(2_000)
  })
})

// ─── Reply threading ──────────────────────────────────────────────────────────

describe('POST /webhooks/sendgrid — reply threading', () => {
  it('appends a message to the existing ticket when In-Reply-To matches', async () => {
    mockTicketMessageFindUnique.mockResolvedValue({ ticketId: 42 })
    mockTicketMessageCreate.mockResolvedValue({})
    mockTicketUpdate.mockResolvedValue({})
    mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    const res = await post(makePayload({
      messageId: 'reply-001@example.com',
      inReplyTo: 'original-001@example.com',
    }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })

    expect(mockTicketMessageFindUnique).toHaveBeenCalledWith({
      where: { messageId: 'original-001@example.com' },
      select: { ticketId: true },
    })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockTicketMessageCreate).toHaveBeenCalledTimes(1)
    const msgArg = mockTicketMessageCreate.mock.calls[0][0].data
    expect(msgArg.ticketId).toBe(42)
    expect(msgArg.messageId).toBe('reply-001@example.com')
    expect(msgArg.direction).toBe('inbound')
    expect(msgArg.senderType).toBe('customer')

    // must NOT create a new ticket or queue jobs
    expect(mockTicketCreate).not.toHaveBeenCalled()
    expect(mockBossSend).not.toHaveBeenCalled()
  })

  it('creates a new ticket when In-Reply-To does not match any stored message', async () => {
    mockTicketMessageFindUnique.mockResolvedValue(null)
    mockGetAiAgentId.mockResolvedValue('ai-agent-id')
    mockTicketCreate.mockResolvedValue({ id: 200 })
    mockBossSend.mockResolvedValue(undefined)

    const res = await post(makePayload({
      messageId: 'reply-orphan@example.com',
      inReplyTo: 'unknown-parent@example.com',
    }))

    expect(res.status).toBe(200)
    expect(mockTicketCreate).toHaveBeenCalledTimes(1)
    expect(mockBossSend).toHaveBeenCalledTimes(2)
  })
})

// ─── Invalid payloads ─────────────────────────────────────────────────────────

describe('POST /webhooks/sendgrid — invalid payloads', () => {
  it('returns 200 ok:false when the from field exceeds the maximum length', async () => {
    const fd = makePayload({ from: 'a'.repeat(400) + '@example.com' })
    const res = await post(fd)
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean; error: string }
    expect(body.ok).toBe(false)
    expect(body.error).toBe('Invalid payload')
    expect(mockTicketCreate).not.toHaveBeenCalled()
  })

  it('returns 200 ok:false when Message-ID is absent from the headers string', async () => {
    const fd = new FormData()
    fd.append('from', 'Jane <jane@example.com>')
    fd.append('to', 'support@example.com')
    fd.append('subject', 'No ID')
    fd.append('text', 'Body')
    // headers string has no Message-ID line
    fd.append('headers', 'From: Jane <jane@example.com>\nSubject: No ID')

    const res = await fetch(`${base}/webhooks/sendgrid`, { method: 'POST', body: fd })
    expect(res.status).toBe(200)
    const body = await res.json() as { ok: boolean }
    expect(body.ok).toBe(false)
    expect(mockTicketCreate).not.toHaveBeenCalled()
  })
})

// ─── Database error ───────────────────────────────────────────────────────────

describe('POST /webhooks/sendgrid — database error', () => {
  it('returns 500 when ticket creation throws', async () => {
    mockGetAiAgentId.mockResolvedValue(null)
    mockTicketCreate.mockRejectedValue(new Error('DB connection lost'))

    const res = await post(makePayload())
    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Failed to process email')
  })

  it('returns 500 when the thread-append transaction throws', async () => {
    mockTicketMessageFindUnique.mockResolvedValue({ ticketId: 42 })
    mockTicketMessageCreate.mockResolvedValue({})
    mockTicketUpdate.mockResolvedValue({})
    mockTransaction.mockRejectedValue(new Error('Transaction failed'))

    const res = await post(makePayload({
      messageId: 'reply-err@example.com',
      inReplyTo: 'original-001@example.com',
    }))

    expect(res.status).toBe(500)
    const body = await res.json() as { error: string }
    expect(body.error).toBe('Failed to process email')
  })
})
