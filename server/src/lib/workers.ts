import { type Job } from 'pg-boss'
import { boss } from './boss.js'
import { classifyTicket } from './ai.js'
import { prisma } from './db.js'

export const CLASSIFY_QUEUE = 'classify-ticket'

type ClassifyJobData = { ticketId: number; subject: string; text: string }

export async function startWorkers() {
  await boss.createQueue(CLASSIFY_QUEUE)

  await boss.work<ClassifyJobData>(CLASSIFY_QUEUE, async (jobs: Job<ClassifyJobData>[]) => {
    const job = jobs[0]
    const { ticketId, subject, text } = job.data
    const category = await classifyTicket(subject, text)
    if (!category) return
    await prisma.ticket.update({ where: { id: ticketId }, data: { category } })
  })
}
