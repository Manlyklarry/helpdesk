import { readFile } from 'fs/promises'
import { join } from 'path'
import { type Job } from 'pg-boss'
import { boss } from './boss.js'
import { classifyTicket, autoResolveTicket, extractFirstName } from './ai.js'
import { prisma } from './db.js'

export const CLASSIFY_QUEUE = 'classify-ticket'
export const AUTO_RESOLVE_QUEUE = 'auto-resolve-ticket'

const KB_PATH = join(import.meta.dirname, '../../knowledge-base.md')

type ClassifyJobData = { ticketId: number; subject: string; text: string }
type AutoResolveJobData = { ticketId: number; subject: string; text: string; fromName: string; fromEmail: string }

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
    const { ticketId, subject, text, fromName, fromEmail } = job.data

    await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'processing' } })

    try {
      const knowledgeBase = await readFile(KB_PATH, 'utf-8')
      const customerFirstName = extractFirstName(fromName)
      const result = await autoResolveTicket(subject, text, knowledgeBase, customerFirstName)

      if (result.canResolve) {
        await prisma.$transaction([
          prisma.ticketMessage.create({
            data: {
              ticketId,
              messageId: `ai-reply-${ticketId}-${Date.now()}`,
              direction: 'outbound',
              senderType: 'agent',
              fromEmail: 'support@larrydevlabs.com',
              fromName: 'LarryDevLabs Support',
              body: result.reply,
            },
          }),
          prisma.ticket.update({
            where: { id: ticketId },
            data: { status: 'resolved', resolvedByAi: true },
          }),
        ])
        console.log(`[auto-resolve] ticket #${ticketId} resolved by AI`)
      } else {
        await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'open' } })
        console.log(`[auto-resolve] ticket #${ticketId} could not be resolved by AI — moved to open`)
      }
    } catch (err) {
      await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'open' } })
      throw err
    }
  })
}
