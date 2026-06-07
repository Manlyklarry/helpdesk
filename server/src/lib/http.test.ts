import { describe, it, expect } from 'bun:test'
import { parseIntParam } from './http'

describe('parseIntParam', () => {
  it('parses a valid integer string', () => {
    expect(parseIntParam('42')).toBe(42)
  })

  it('parses zero', () => {
    expect(parseIntParam('0')).toBe(0)
  })

  it('parses negative integers', () => {
    expect(parseIntParam('-7')).toBe(-7)
  })

  it('returns null for a non-numeric string', () => {
    expect(parseIntParam('abc')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(parseIntParam('')).toBeNull()
  })

  it('truncates at the first non-numeric character (parseInt behaviour)', () => {
    expect(parseIntParam('12abc')).toBe(12)
  })
})
