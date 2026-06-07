import { describe, it, expect } from 'bun:test'
import { z, ZodError } from 'zod'
import { firstZodError } from './zod'

describe('firstZodError', () => {
  it('returns the message of the first Zod issue', () => {
    const result = z.string().min(5).safeParse('hi')
    expect(result.success).toBe(false)
    if (!result.success) {
      const msg = firstZodError(result.error)
      expect(typeof msg).toBe('string')
      expect(msg.length).toBeGreaterThan(0)
    }
  })

  it('returns the first issue when there are multiple validation failures', () => {
    const result = z.object({ a: z.string().min(5), b: z.number() }).safeParse({ a: 'hi', b: 'not-a-number' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(1)
      expect(firstZodError(result.error)).toBe(result.error.issues[0].message)
    }
  })

  it('returns the default fallback "Invalid request" when there are no issues', () => {
    const emptyError = new ZodError([])
    expect(firstZodError(emptyError)).toBe('Invalid request')
  })

  it('returns the custom fallback when provided and there are no issues', () => {
    const emptyError = new ZodError([])
    expect(firstZodError(emptyError, 'Custom fallback')).toBe('Custom fallback')
  })
})
