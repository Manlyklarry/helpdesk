import { describe, it, expect, mock, beforeAll, afterAll, beforeEach } from 'bun:test'
import express from 'express'
import type { Server } from 'http'

// ─── Mocks (must be declared before the router is imported) ──────────────────

const mockUserFindMany = mock()
const mockUserFindUnique = mock()

mock.module('../lib/db.js', () => ({
  prisma: {
    user: { findMany: mockUserFindMany, findUnique: mockUserFindUnique },
  },
}))

const mockCreateUser = mock()
const mockUpdateUser = mock()
const mockDeleteUser = mock()

mock.module('../lib/user-manager.js', () => ({
  createUser: mockCreateUser,
  updateUser: mockUpdateUser,
  deleteUser: mockDeleteUser,
}))

const { default: usersRouter } = await import('./users.js')

// ─── Test server ─────────────────────────────────────────────────────────────

// Admin role is injected so requireAdmin middleware passes for all protected routes.
// The 403 path is covered by requireAdmin.test.ts.
const app = express()
app.use(express.json())
app.use((req, _, next) => { (req as any).user = { id: 'actor-1', role: 'admin' }; next() })
app.use('/users', usersRouter)

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
  mockUserFindMany.mockReset()
  mockUserFindUnique.mockReset()
  mockCreateUser.mockReset()
  mockUpdateUser.mockReset()
  mockDeleteUser.mockReset()
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const get = (path: string) => fetch(`${base}${path}`)
const post = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const patch = (path: string, body: unknown) =>
  fetch(`${base}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
const del = (path: string) => fetch(`${base}${path}`, { method: 'DELETE' })

// ─── GET /users/agents ────────────────────────────────────────────────────────

describe('GET /users/agents', () => {
  it('returns the list of non-deleted agents', async () => {
    const agents = [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }]
    mockUserFindMany.mockResolvedValue(agents)
    const res = await get('/users/agents')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(agents)
    expect(mockUserFindMany.mock.calls[0][0]).toMatchObject({ where: { deletedAt: null } })
  })

  it('returns 500 on database error', async () => {
    mockUserFindMany.mockRejectedValue(new Error('DB error'))
    const res = await get('/users/agents')
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to load agents')
  })
})

// ─── GET /users ───────────────────────────────────────────────────────────────

describe('GET /users', () => {
  it('returns the full user list', async () => {
    const users = [{ id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'agent', createdAt: '2026-01-01T00:00:00.000Z' }]
    mockUserFindMany.mockResolvedValue(users)
    const res = await get('/users')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(users)
  })

  it('returns 500 on database error', async () => {
    mockUserFindMany.mockRejectedValue(new Error('DB error'))
    const res = await get('/users')
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to load users')
  })
})

// ─── POST /users ──────────────────────────────────────────────────────────────

describe('POST /users', () => {
  const validBody = { name: 'Bob Smith', email: 'bob@test.com', password: 'password123', role: 'agent' }

  it('creates a user and returns 201 with the new record', async () => {
    const newUser = { id: 'u2', name: 'Bob Smith', email: 'bob@test.com', role: 'agent', createdAt: '2026-01-01T00:00:00.000Z' }
    mockUserFindUnique.mockResolvedValue(null)
    mockCreateUser.mockResolvedValue(newUser)

    const res = await post('/users', validBody)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual(newUser)
    expect(mockCreateUser).toHaveBeenCalledWith('Bob Smith', 'bob@test.com', 'password123', 'agent')
  })

  it('defaults role to "agent" when not provided', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    mockCreateUser.mockResolvedValue({ id: 'u3' })
    await post('/users', { name: 'Carol Jones', email: 'carol@test.com', password: 'password123' })
    expect(mockCreateUser.mock.calls[0][3]).toBe('agent')
  })

  it('returns 409 when the email is already taken', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'bob@test.com' })
    const res = await post('/users', validBody)
    expect(res.status).toBe(409)
    expect((await res.json() as any).error).toBe('A user with that email already exists')
  })

  it('returns 400 when name is too short', async () => {
    const res = await post('/users', { ...validBody, name: 'AB' })
    expect(res.status).toBe(400)
    expect(typeof (await res.json() as any).error).toBe('string')
  })

  it('returns 400 when email is invalid', async () => {
    const res = await post('/users', { ...validBody, email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password is too short', async () => {
    const res = await post('/users', { ...validBody, password: 'short' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when password contains spaces', async () => {
    const res = await post('/users', { ...validBody, password: 'has spaces here' })
    expect(res.status).toBe(400)
  })

  it('returns 500 on database error during creation', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    mockCreateUser.mockRejectedValue(new Error('DB error'))
    const res = await post('/users', validBody)
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to create user')
  })
})

// ─── PATCH /users/:id ────────────────────────────────────────────────────────

describe('PATCH /users/:id', () => {
  const validBody = { name: 'Alice Updated', email: 'alice@test.com', role: 'agent' }

  it('updates the user and returns the updated record', async () => {
    const existing = { id: 'u1', email: 'alice@test.com', role: 'agent' }
    const updated = { id: 'u1', name: 'Alice Updated', email: 'alice@test.com', role: 'agent', createdAt: '2026-01-01T00:00:00.000Z' }
    mockUserFindUnique.mockResolvedValue(existing)
    mockUpdateUser.mockResolvedValue(updated)

    const res = await patch('/users/u1', validBody)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(updated)
  })

  it('returns 404 when the user does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const res = await patch('/users/ghost', validBody)
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('User not found')
  })

  it('returns 409 when the new email is already taken by another user', async () => {
    const existing = { id: 'u1', email: 'alice@old.com' }
    const emailOwner = { id: 'u2', email: 'alice@test.com' }
    mockUserFindUnique.mockResolvedValueOnce(existing).mockResolvedValueOnce(emailOwner)
    const res = await patch('/users/u1', validBody)
    expect(res.status).toBe(409)
    expect((await res.json() as any).error).toBe('A user with that email already exists')
  })

  it('returns 400 when body fails validation', async () => {
    const res = await patch('/users/u1', { name: 'X', email: 'bad-email', role: 'agent' })
    expect(res.status).toBe(400)
  })

  it('returns 500 on database error', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'alice@test.com' })
    mockUpdateUser.mockRejectedValue(new Error('DB error'))
    const res = await patch('/users/u1', validBody)
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to update user')
  })
})

// ─── DELETE /users/:id ────────────────────────────────────────────────────────

describe('DELETE /users/:id', () => {
  it('soft-deletes an agent and returns { success: true }', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'agent', deletedAt: null })
    mockDeleteUser.mockResolvedValue(undefined)

    const res = await del('/users/u1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
  })

  it('returns 403 when trying to delete an admin user', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'admin', deletedAt: null })
    const res = await del('/users/u1')
    expect(res.status).toBe(403)
    expect((await res.json() as any).error).toBe('Admin users cannot be deleted')
  })

  it('returns 404 when the user does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    const res = await del('/users/ghost')
    expect(res.status).toBe(404)
    expect((await res.json() as any).error).toBe('User not found')
  })

  it('returns 404 when the user is already soft-deleted', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'agent', deletedAt: new Date() })
    const res = await del('/users/u1')
    expect(res.status).toBe(404)
  })

  it('returns 500 on database error', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', role: 'agent', deletedAt: null })
    mockDeleteUser.mockRejectedValue(new Error('DB error'))
    const res = await del('/users/u1')
    expect(res.status).toBe(500)
    expect((await res.json() as any).error).toBe('Failed to delete user')
  })
})
