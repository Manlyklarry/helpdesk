import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db.js'
import { sanitizeEmailHtml } from '../lib/sanitize.js'
import { boss } from '../lib/boss.js'
import { CLASSIFY_QUEUE, AUTO_RESOLVE_QUEUE } from '../lib/workers.js'

const router = Router()

// When a provider is chosen, set WEBHOOK_SECRET in .env and add signature
// verification here before processing the payload.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Normalized inbound email payload — provider-agnostic.
// When wiring up a real email provider, add an adapter route (e.g. /email/resend)
// that transforms the provider's payload into this shape and forwards it here.
const inboundEmailSchema = z.object({
  from: z.string().max(320),
  to: z.array(z.string().max(320)).min(1),
  subject: z.string().max(998),
  text: z.string().max(200_000),
  html: z.string().max(500_000).optional(),
  messageId: z.string().max(998),
  inReplyTo: z.string().max(998).optional(),
})

function parseFrom(from: string): { fromName: string; fromEmail: string } {
  const match = from.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return { fromName: match[1].trim() || match[2], fromEmail: match[2].trim() }
  }
  return { fromName: from.trim(), fromEmail: from.trim() }
}

router.post('/email', async (req, res) => {
  const parsed = inboundEmailSchema.safeParse(req.body)
  if (!parsed.success) {
    // Log and return 200 to prevent retry storms from webhook providers
    console.error('Invalid inbound email payload:', parsed.error.issues)
    return res.status(200).json({ ok: false, error: 'Invalid payload' })
  }

  const { from, subject, text, html, messageId, inReplyTo } = parsed.data
  const { fromName, fromEmail } = parseFrom(from)
  const safeHtml = html ? sanitizeEmailHtml(html) : undefined

  try {
    if (inReplyTo) {
      // Check if this is a reply to an existing thread
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

        return res.json({ ok: true })
      }
    }

    // New ticket
    const ticket = await prisma.ticket.create({
      data: {
        subject,
        fromEmail,
        fromName,
        body: text,
        bodyHtml: safeHtml,
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
      boss.send(AUTO_RESOLVE_QUEUE, { ticketId: ticket.id, subject, text, fromName, fromEmail }),
    ])

    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to process inbound email:', err)
    return res.status(500).json({ error: 'Failed to process email' })
  }
})

export default router
