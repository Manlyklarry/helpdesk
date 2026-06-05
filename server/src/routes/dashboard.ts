import { Router } from 'express'
import { prisma } from '../lib/db.js'

const router = Router()

type StatsRow = {
  totalTickets: bigint
  openTickets: bigint
  processingTickets: bigint
  resolvedTickets: bigint
  aiResolvedTickets: bigint
  aiResolutionRate: number
  avgResolutionTimeMs: bigint | null
}

type TicketsPerDayRow = {
  date: string
  count: bigint
}

router.get('/stats', async (_req, res) => {
  try {
    const [row] = await prisma.$queryRaw<StatsRow[]>`SELECT * FROM get_dashboard_stats()`

    return res.json({
      totalTickets: Number(row.totalTickets),
      openTickets: Number(row.openTickets),
      processingTickets: Number(row.processingTickets),
      resolvedTickets: Number(row.resolvedTickets),
      aiResolvedTickets: Number(row.aiResolvedTickets),
      aiResolutionRate: Number(row.aiResolutionRate),
      avgResolutionTimeMs: row.avgResolutionTimeMs !== null ? Number(row.avgResolutionTimeMs) : null,
    })
  } catch (err) {
    console.error('Failed to fetch dashboard stats:', err)
    return res.status(500).json({ error: 'Failed to load dashboard stats' })
  }
})

router.get('/tickets-per-day', async (_req, res) => {
  try {
    const rows = await prisma.$queryRaw<TicketsPerDayRow[]>`SELECT * FROM get_tickets_per_day(${30})`

    return res.json(rows.map((r) => ({ date: r.date, count: Number(r.count) })))
  } catch (err) {
    console.error('Failed to fetch tickets per day:', err)
    return res.status(500).json({ error: 'Failed to load chart data' })
  }
})

export default router
