import { describe, it, expect, mock, beforeEach } from 'bun:test'

// ─── Mocks (must be declared before the module is imported) ──────────────────

const mockSignUpEmail = mock()
mock.module('better-auth', () => ({
  betterAuth: mock().mockReturnValue({ api: { signUpEmail: mockSignUpEmail } }),
}))
mock.module('better-auth/adapters/prisma', () => ({ prismaAdapter: mock().mockReturnValue({}) }))

const mockHashPassword = mock()
mock.module('better-auth/crypto', () => ({ hashPassword: mockHashPassword }))

const mockUserUpdate = mock()
const mockSessionDeleteMany = mock()
const mockTicketUpdateMany = mock()
const mockAccountUpdateMany = mock()
const mockTransaction = mock()

mock.module('./db.js', () => ({
  prisma: {
    user: { update: mockUserUpdate },
    session: { deleteMany: mockSessionDeleteMany },
    ticket: { updateMany: mockTicketUpdateMany },
    account: { updateMany: mockAccountUpdateMany },
    $transaction: mockTransaction,
  },
}))

const { createUser, deleteUser, updateUser } = await import('./user-manager.js')

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSignUpEmail.mockReset()
  mockHashPassword.mockReset()
  mockUserUpdate.mockReset()
  mockSessionDeleteMany.mockReset()
  mockTicketUpdateMany.mockReset()
  mockAccountUpdateMany.mockReset()
  mockTransaction.mockReset()
})

// ─── createUser ───────────────────────────────────────────────────────────────

describe('createUser', () => {
  it('calls signUpEmail then sets the role and returns the created user', async () => {
    const fakeUser = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'agent', createdAt: new Date() }
    mockSignUpEmail.mockResolvedValue(undefined)
    mockUserUpdate.mockResolvedValue(fakeUser)

    const result = await createUser('Alice', 'alice@test.com', 'password123', 'agent')

    expect(mockSignUpEmail).toHaveBeenCalledTimes(1)
    expect(mockSignUpEmail.mock.calls[0][0].body).toMatchObject({
      name: 'Alice',
      email: 'alice@test.com',
      password: 'password123',
    })
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { email: 'alice@test.com' },
      data: { role: 'agent' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    expect(result).toEqual(fakeUser)
  })

  it('defaults role to "agent" when not supplied', async () => {
    mockSignUpEmail.mockResolvedValue(undefined)
    mockUserUpdate.mockResolvedValue({})

    await createUser('Bob', 'bob@test.com', 'password123')

    expect(mockUserUpdate.mock.calls[0][0].data.role).toBe('agent')
  })

  it('propagates errors thrown by signUpEmail', async () => {
    mockSignUpEmail.mockRejectedValue(new Error('Email taken'))
    await expect(createUser('X', 'x@x.com', 'pass1234')).rejects.toThrow('Email taken')
  })
})

// ─── deleteUser ───────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  it('runs a transaction that deletes sessions, unassigns tickets, and soft-deletes the user', async () => {
    mockSessionDeleteMany.mockResolvedValue({ count: 1 })
    mockTicketUpdateMany.mockResolvedValue({ count: 3 })
    mockUserUpdate.mockResolvedValue({ id: 'u1' })
    mockTransaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops))

    await deleteUser('u1')

    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockSessionDeleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } })
    expect(mockTicketUpdateMany).toHaveBeenCalledWith({
      where: { assignedAgentId: 'u1' },
      data: { assignedAgentId: null },
    })
    expect(mockUserUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' } }))
  })
})

// ─── updateUser ───────────────────────────────────────────────────────────────

describe('updateUser', () => {
  it('updates name, email and role without touching the password when none is supplied', async () => {
    const fakeUser = { id: 'u1', name: 'Alice', email: 'alice@new.com', role: 'admin', createdAt: new Date() }
    mockUserUpdate.mockResolvedValue(fakeUser)

    const result = await updateUser('u1', { name: 'Alice', email: 'alice@new.com', role: 'admin' })

    expect(mockHashPassword).not.toHaveBeenCalled()
    expect(mockAccountUpdateMany).not.toHaveBeenCalled()
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { name: 'Alice', email: 'alice@new.com', role: 'admin' },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    expect(result).toEqual(fakeUser)
  })

  it('hashes the new password and updates the credential account record when a password is provided', async () => {
    mockHashPassword.mockResolvedValue('hashed-secret')
    mockAccountUpdateMany.mockResolvedValue({ count: 1 })
    mockUserUpdate.mockResolvedValue({ id: 'u1' })

    await updateUser('u1', { name: 'Alice', email: 'alice@test.com', role: 'agent', password: 'newPass123' })

    expect(mockHashPassword).toHaveBeenCalledWith('newPass123')
    expect(mockAccountUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', providerId: 'credential' },
      data: { password: 'hashed-secret' },
    })
  })
})
