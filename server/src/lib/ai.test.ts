import { describe, it, expect } from 'bun:test'
import { extractFirstName, buildPolishSystem } from './ai'

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

describe('buildPolishSystem', () => {
  const system = buildPolishSystem('Jane', 'Rowland')

  it('addresses the customer by first name', () => {
    expect(system).toContain('Jane')
  })

  it('includes the agent name in the sign-off instruction', () => {
    expect(system).toContain('Rowland')
  })

  it('includes the domain larrydevlabs.com', () => {
    expect(system).toContain('larrydevlabs.com')
  })

  it('instructs to sign off with agent name and domain', () => {
    expect(system).toContain('Sign off with the agent name "Rowland" and include larrydevlabs.com in the signature.')
  })

  it('instructs to address customer by first name', () => {
    expect(system).toContain('Address the customer by their first name: Jane.')
  })

  it('instructs to return only the improved reply', () => {
    expect(system).toContain('Return only the improved reply text')
  })

  it('reflects different customer names', () => {
    const s = buildPolishSystem('Carlos', 'Rowland')
    expect(s).toContain('Carlos')
    expect(s).not.toContain('Jane')
  })

  it('reflects different agent names', () => {
    const s = buildPolishSystem('Jane', 'Alice')
    expect(s).toContain('"Alice"')
    expect(s).not.toContain('"Rowland"')
  })
})
