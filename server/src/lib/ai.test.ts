import { describe, it, expect } from 'bun:test'
import { extractFirstName } from './ai'

describe('extractFirstName', () => {
  it('returns the first word of a full name', () => {
    expect(extractFirstName('Jane Smith')).toBe('Jane')
  })

  it('handles a single-word name', () => {
    expect(extractFirstName('Alice')).toBe('Alice')
  })

  it('handles a three-part name', () => {
    expect(extractFirstName('Mary Jane Watson')).toBe('Mary')
  })

  it('trims leading whitespace', () => {
    expect(extractFirstName('  Bob Jones')).toBe('Bob')
  })

  it('collapses multiple spaces between tokens', () => {
    expect(extractFirstName('John   Doe')).toBe('John')
  })
})
