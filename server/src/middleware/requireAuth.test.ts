import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from 'bun:test'
import express from 'express'
import type { Server } from 'http'

// ─── Mocks (must be declared before the module is imported) ──────────────────

const mockGetSession = mock()
mock.module('../lib/auth.js', () => ({
  auth: { api: { getSession: mockGetSession } },
}))

const { requireAuth } = await import('./requireAuth.js')

// ─── Test server ─────────────────────────────────────────────────────────────

const app = express()
// A downstream handler that echoes back the attached user ID so we can assert it
app.get('/test', requireAuth, (req, res) => {
  res.json({ userId: (req as any).user?.id ?? null })
})

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

beforeEach(() => { mockGetSession.mockReset() })

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('requireAuth', () => {
  it('returns 401 when there is no active session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await fetch(`${base}/test`)
    expect(res.status).toBe(401)
    expect((await res.json() as any).error).toBe('Unauthorized')
  })

  it('calls next and attaches the session user to req when a valid session exists', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'agent' },
      session: { id: 's1', userId: 'u1' },
    })
    const res = await fetch(`${base}/test`)
    expect(res.status).toBe(200)
    expect((await res.json() as any).userId).toBe('u1')
  })

  it('passes the request headers to getSession', async () => {
    mockGetSession.mockResolvedValue({
      user: { id: 'u2' },
      session: { id: 's2', userId: 'u2' },
    })
    await fetch(`${base}/test`, { headers: { cookie: 'session=abc123' } })
    expect(mockGetSession).toHaveBeenCalledTimes(1)
    expect(mockGetSession.mock.calls[0][0].headers).toBeDefined()
  })
})
