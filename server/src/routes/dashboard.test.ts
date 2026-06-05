import { describe, it, expect, mock, beforeAll, afterAll } from 'bun:test'
import express from 'express'
import type { Server } from 'http'

// Mock prisma before importing the router
const mockQueryRaw = mock()
mock.module('../lib/db.js', () => ({ prisma: { $queryRaw: mockQueryRaw } }))

const { default: dashboardRouter } = await import('./dashboard.js')

const app = express()
app.use(express.json())
app.use('/dashboard', dashboardRouter)

let server: Server
let base: string

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address() as { port: number }
        base = `http://localhost:${addr.port}`
        resolve()
      })
    }),
)

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())))

// ---------------------------------------------------------------------------
// GET /dashboard/stats
// ---------------------------------------------------------------------------

describe('GET /dashboard/stats', () => {
  it('returns all stats fields as plain numbers (BigInt converted)', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        totalTickets: BigInt(118),
        openTickets: BigInt(54),
        processingTickets: BigInt(0),
        resolvedTickets: BigInt(64),
        aiResolvedTickets: BigInt(5),
        aiResolutionRate: 8,
        avgResolutionTimeMs: BigInt(2_478_624_802),
      },
    ])

    const res = await fetch(`${base}/dashboard/stats`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual({
      totalTickets: 118,
      openTickets: 54,
      processingTickets: 0,
      resolvedTickets: 64,
      aiResolvedTickets: 5,
      aiResolutionRate: 8,
      avgResolutionTimeMs: 2_478_624_802,
    })
  })

  it('returns avgResolutionTimeMs as null when no resolved tickets', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        totalTickets: BigInt(5),
        openTickets: BigInt(5),
        processingTickets: BigInt(0),
        resolvedTickets: BigInt(0),
        aiResolvedTickets: BigInt(0),
        aiResolutionRate: 0,
        avgResolutionTimeMs: null,
      },
    ])

    const res = await fetch(`${base}/dashboard/stats`)
    const body = await res.json()
    expect(body.avgResolutionTimeMs).toBeNull()
  })

  it('returns 500 when the database call throws', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB error'))
    const res = await fetch(`${base}/dashboard/stats`)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load dashboard stats')
  })
})

// ---------------------------------------------------------------------------
// GET /dashboard/tickets-per-day
// ---------------------------------------------------------------------------

describe('GET /dashboard/tickets-per-day', () => {
  it('returns an array of date/count objects with numbers (not BigInts)', async () => {
    mockQueryRaw.mockResolvedValueOnce([
      { date: '2026-05-29', count: BigInt(6) },
      { date: '2026-05-30', count: BigInt(5) },
      { date: '2026-05-31', count: BigInt(0) },
    ])

    const res = await fetch(`${base}/dashboard/tickets-per-day`)
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body).toEqual([
      { date: '2026-05-29', count: 6 },
      { date: '2026-05-30', count: 5 },
      { date: '2026-05-31', count: 0 },
    ])
  })

  it('returns an empty array when the function returns no rows', async () => {
    mockQueryRaw.mockResolvedValueOnce([])
    const res = await fetch(`${base}/dashboard/tickets-per-day`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns 500 when the database call throws', async () => {
    mockQueryRaw.mockRejectedValueOnce(new Error('DB error'))
    const res = await fetch(`${base}/dashboard/tickets-per-day`)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Failed to load chart data')
  })
})
