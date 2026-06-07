import { describe, it, expect, mock, beforeEach } from 'bun:test'

// ─── Mocks (must be declared before the module is imported) ──────────────────

const mockGenerateText = mock()
mock.module('ai', () => ({ generateText: mockGenerateText }))
mock.module('@ai-sdk/openai', () => ({ openai: mock().mockReturnValue('fake-model') }))

// Inject known branding values so prompt assertions are deterministic
mock.module('./constants.js', () => ({
  COMPANY_NAME: 'TestCo',
  COMPANY_DOMAIN: 'testco.com',
  AI_AGENT_EMAIL: 'ai@test.local',
}))

const { polishReply, autoResolveTicket } = await import('./ai.js')

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => { mockGenerateText.mockReset() })

// ─── polishReply branding ─────────────────────────────────────────────────────

describe('polishReply — company branding in system prompt', () => {
  it('includes COMPANY_NAME in the system prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'polished' })
    await polishReply('my draft', 'Jane')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).toContain('TestCo')
  })

  it('includes COMPANY_DOMAIN in the system prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: 'polished' })
    await polishReply('my draft', 'Jane')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).toContain('testco.com')
  })

  it('does not contain hardcoded legacy branding', async () => {
    mockGenerateText.mockResolvedValue({ text: 'polished' })
    await polishReply('my draft', 'Jane')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).not.toContain('LarryDevLabs')
    expect(system).not.toContain('larrydevlabs.com')
  })
})

// ─── autoResolveTicket branding ───────────────────────────────────────────────

describe('autoResolveTicket — company branding in system prompt', () => {
  it('includes COMPANY_NAME in the system prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"canResolve":false}' })
    await autoResolveTicket('subject', 'body', 'kb', 'Alice')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).toContain('TestCo')
  })

  it('includes COMPANY_DOMAIN in the system prompt', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"canResolve":false}' })
    await autoResolveTicket('subject', 'body', 'kb', 'Alice')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).toContain('testco.com')
  })

  it('does not contain hardcoded legacy branding', async () => {
    mockGenerateText.mockResolvedValue({ text: '{"canResolve":false}' })
    await autoResolveTicket('subject', 'body', 'kb', 'Alice')
    const system: string = mockGenerateText.mock.calls[0][0].system
    expect(system).not.toContain('LarryDevLabs')
    expect(system).not.toContain('larrydevlabs.com')
  })
})
