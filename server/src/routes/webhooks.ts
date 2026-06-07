import { Router } from 'express'
import multer from 'multer'
import Parse from '@sendgrid/inbound-mail-parser'
import { z } from 'zod'
import { prisma } from '../lib/db.js'
import { sanitizeEmailHtml } from '../lib/sanitize.js'
import { boss } from '../lib/boss.js'
import { CLASSIFY_QUEUE, AUTO_RESOLVE_QUEUE, getAiAgentId } from '../lib/workers.js'

const router = Router()
// multer populates req.body (text fields) and req.files (attachments);
// the parser needs both — attachments themselves are discarded.
const upload = multer().any()

const PARSE_KEYS = ['from', 'to', 'subject', 'text', 'html', 'headers']

const normalizedEmailSchema = z.object({
  from: z.string().max(320),
  to: z.array(z.string().max(320)).min(1),
  subject: z.string().max(998),
  text: z.string().max(200_000),
  html: z.string().max(500_000).optional(),
  messageId: z.string().min(1).max(998),
  inReplyTo: z.string().max(998).optional(),
})

type NormalizedEmail = z.infer<typeof normalizedEmailSchema>

function parseFrom(from: string): { fromName: string; fromEmail: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return { fromName: match[1].trim() || match[2], fromEmail: match[2].trim() }
  }
  return { fromName: from.trim(), fromEmail: from.trim() }
}

// Extract a single header value from SendGrid's raw RFC 2822 headers string
function parseHeaderValue(headers: string, name: string): string | undefined {
  const match = headers.match(new RegExp(`^${name}:\\s*(.+)`, 'im'))
  return match?.[1]?.trim()
}

async function processInboundEmail(data: NormalizedEmail): Promise<void> {
  const { from, subject, text, html, messageId, inReplyTo } = data
  const { fromName, fromEmail } = parseFrom(from)
  const safeHtml = html ? sanitizeEmailHtml(html) : undefined

  if (inReplyTo) {
    const parentMessage = await prisma.ticketMessage.findUnique({
      where: { messageId: inReplyTo },
      select: { ticketId: true },
    })

    if (parentMessage) {
      await prisma.$transaction([
        prisma.ticketMessage.create({
          data: {
            ticketId: parentMessage.ticketId,
            messageId,
            direction: 'inbound',
            senderType: 'customer',
            fromEmail,
            fromName,
            body: text,
            htmlBody: safeHtml,
          },
        }),
        prisma.ticket.update({
          where: { id: parentMessage.ticketId },
          data: { updatedAt: new Date() },
        }),
      ])
      return
    }
  }

  const aiAgentId = await getAiAgentId()
  const ticket = await prisma.ticket.create({
    data: {
      subject,
      fromEmail,
      fromName,
      body: text,
      bodyHtml: safeHtml,
      assignedAgentId: aiAgentId,
      messages: {
        create: {
          messageId,
          direction: 'inbound',
          senderType: 'customer',
          fromEmail,
          fromName,
          body: text,
          htmlBody: safeHtml,
        },
      },
    },
    select: { id: true },
  })

  await Promise.all([
    boss.send(CLASSIFY_QUEUE, { ticketId: ticket.id, subject, text: text.slice(0, 2_000) }),
    boss.send(AUTO_RESOLVE_QUEUE, { ticketId: ticket.id, subject, text, fromName }),
  ])
}

// SendGrid Inbound Parse webhook
router.post('/sendgrid', upload, async (req, res) => {
  const files: Express.Multer.File[] = (req as any).files ?? []
  const parser = new Parse(
    { keys: PARSE_KEYS },
    // parser's reduce() crashes on an empty array — only pass files when present
    { body: req.body, ...(files.length ? { files } : {}) },
  )

  const fields = parser.keyValues()
  const rawHeaders: string = typeof fields.headers === 'string' ? fields.headers : ''

  // Message-ID and In-Reply-To live in the raw headers string
  const rawMessageId = parseHeaderValue(rawHeaders, 'Message-ID')
  const rawInReplyTo = parseHeaderValue(rawHeaders, 'In-Reply-To')

  const parsed = normalizedEmailSchema.safeParse({
    from: fields.from,
    to: [fields.to],
    subject: fields.subject,
    text: fields.text,
    html: fields.html || undefined,
    messageId: rawMessageId?.replace(/^<|>$/g, '') ?? '',
    inReplyTo: rawInReplyTo?.replace(/^<|>$/g, ''),
  })

  if (!parsed.success) {
    console.error('Invalid SendGrid payload:', parsed.error.issues)
    // 200 prevents SendGrid retry storms on permanently-bad payloads
    return res.status(200).json({ ok: false, error: 'Invalid payload' })
  }

  try {
    await processInboundEmail(parsed.data)
    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to process inbound email:', err)
    return res.status(500).json({ error: 'Failed to process email' })
  }
})

export default router
