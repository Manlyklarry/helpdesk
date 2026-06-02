import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/db.js'

const router = Router()

// When a provider is chosen, set WEBHOOK_SECRET in .env and add signature
// verification here before processing the payload.
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Normalized inbound email payload — provider-agnostic.
// When wiring up a real email provider, add an adapter route (e.g. /email/resend)
// that transforms the provider's payload into this shape and forwards it here.
const inboundEmailSchema = z.object({
  from: z.string(),       // "Name <email@example.com>" or bare email
  to: z.array(z.string()).min(1),
  subject: z.string(),
  text: z.string(),
  html: z.string().optional(),
  messageId: z.string(),  // unique ID for this message (for threading)
  inReplyTo: z.string().optional(), // messageId of the parent email
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
              fromEmail,
              fromName,
              body: text,
              htmlBody: html,
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
    await prisma.ticket.create({
      data: {
        subject,
        fromEmail,
        fromName,
        messages: {
          create: {
            messageId,
            direction: 'inbound',
            fromEmail,
            fromName,
            body: text,
            htmlBody: html,
          },
        },
      },
    })

    return res.json({ ok: true })
  } catch (err) {
    console.error('Failed to process inbound email:', err)
    return res.status(500).json({ error: 'Failed to process email' })
  }
})

export default router
