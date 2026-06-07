import { describe, it, expect, mock } from 'bun:test'
import type { Request, Response, NextFunction } from 'express'
import { requireAdmin } from './requireAdmin'

function makeReqRes(role?: string) {
  const req = { user: role !== undefined ? { role } : undefined } as unknown as Request
  const mockJson = mock()
  const mockStatus = mock().mockReturnValue({ json: mockJson })
  const res = { status: mockStatus } as unknown as Response
  const next = mock() as unknown as NextFunction
  return { req, res, next, mockStatus, mockJson }
}

describe('requireAdmin', () => {
  it('calls next() when req.user.role is "admin"', () => {
    const { req, res, next, mockStatus } = makeReqRes('admin')
    requireAdmin(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(mockStatus).not.toHaveBeenCalled()
  })

  it('returns 403 when req.user.role is "agent"', () => {
    const { req, res, next, mockStatus, mockJson } = makeReqRes('agent')
    requireAdmin(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(mockStatus).toHaveBeenCalledWith(403)
    expect(mockJson).toHaveBeenCalledWith({ error: 'Forbidden' })
  })

  it('returns 403 when req.user is undefined', () => {
    const { req, res, next, mockStatus } = makeReqRes(undefined)
    requireAdmin(req, res, next)
    expect(next).not.toHaveBeenCalled()
    expect(mockStatus).toHaveBeenCalledWith(403)
  })
})
