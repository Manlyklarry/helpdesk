import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Job } from 'pg-boss'
import { boss } from './boss.js'
import { classifyTicket, autoResolveTicket, extractFirstName } from './ai.js'
import { prisma } from './db.js'
import { AI_AGENT_EMAIL } from './constants.js'
import { sendReply } from './email.js'

export const CLASSIFY_QUEUE = 'classify-ticket'
export const AUTO_RESOLVE_QUEUE = 'auto-resolve-ticket'

let cachedAiAgentId: string | null | undefined = undefined

export async function getAiAgentId(): Promise<string | null> {
  if (cachedAiAgentId !== undefined) return cachedAiAgentId
  const agent = await prisma.user.findFirst({
    where: { email: AI_AGENT_EMAIL, deletedAt: null },
    select: { id: true },
  })
  cachedAiAgentId = agent?.id ?? null
  return cachedAiAgentId
}

const KB_PATH = join(import.meta.dirname, '../../knowledge-base.md')

type ClassifyJobData = { ticketId: number; subject: string; text: string }
type AutoResolveJobData = { ticketId: number; subject: string; text: string; fromName: string }

export async function startWorkers() {
  await boss.createQueue(CLASSIFY_QUEUE)
  await boss.createQueue(AUTO_RESOLVE_QUEUE)

  await boss.work<ClassifyJobData>(CLASSIFY_QUEUE, async (jobs: Job<ClassifyJobData>[]) => {
    const job = jobs[0]
    const { ticketId, subject, text } = job.data
    const category = await classifyTicket(subject, text)
    if (!category) return
    await prisma.ticket.update({ where: { id: ticketId }, data: { category } })
  })

  await boss.work<AutoResolveJobData>(AUTO_RESOLVE_QUEUE, async (jobs: Job<AutoResolveJobData>[]) => {
    const job = jobs[0]
    const { ticketId, subject, text, fromName } = job.data

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        fromEmail: true,
        messages: {
          where: { direction: 'inbound' },
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { messageId: true },
        },
      },
    })

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'processing' } })

    try {
      const knowledgeBase = await readFile(KB_PATH, 'utf-8')
      const customerFirstName = extractFirstName(fromName)
      const result = await autoResolveTicket(subject, text, knowledgeBase, customerFirstName)

      if (result.canResolve) {
        const supportEmail = process.env.SUPPORT_EMAIL ?? 'support@system.local'
        const outboundMessageId = `ai-reply-${ticketId}-${Date.now()}`

        await prisma.$transaction([
          prisma.ticketMessage.create({
            data: {
              ticketId,
              messageId: outboundMessageId,
              direction: 'outbound',
              senderType: 'agent',
              fromEmail: supportEmail,
              fromName: 'Support',
              body: result.reply,
            },
          }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'resolved', resolvedByAi: true },
          }),
        ])

        if (ticket) {
          sendReply({
            to: ticket.fromEmail,
            subject,
            text: result.reply,
            fromName: 'Support',
            messageId: outboundMessageId,
            inReplyTo: ticket.messages[0]?.messageId,
          }).catch((err) => console.error(`[email] Failed to send auto-resolve reply for ticket #${ticketId}:`, err))
        }

        console.log(`[auto-resolve] ticket #${ticketId} resolved by AI`)
      } else {
        // Unassign from AI agent so a human can pick it up
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { status: 'open', assignedAgentId: null },
        })
        console.log(`[auto-resolve] ticket #${ticketId} could not be resolved by AI — moved to open`)
      }
    } catch (err) {
      // Error fallback: unassign so the ticket isn't stuck assigned to AI
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'open', assignedAgentId: null },
      })
      throw err
    }
  })
}
