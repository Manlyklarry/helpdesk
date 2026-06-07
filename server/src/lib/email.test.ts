import { describe, it, expect, mock, beforeEach } from 'bun:test'

// ─── Mocks (must be declared before the module is imported) ──────────────────

// Set env vars before module load so the module-level constants capture them
process.env.SENDGRID_API_KEY = 'test-api-key'
process.env.SENDGRID_FROM_EMAIL = 'support@testco.com'

const mockSend = mock()
const mockSetApiKey = mock()

mock.module('@sendgrid/mail', () => ({
  default: { setApiKey: mockSetApiKey, send: mockSend },
}))

const { sendReply } = await import('./email.js')

// ─────────────────────────────────────────────────────────────────────────────

// Only reset mockSend between tests; mockSetApiKey is called once at module init
// and we want to assert on that call in the first describe block.
beforeEach(() => { mockSend.mockReset() })

// ─── Module initialisation ────────────────────────────────────────────────────

describe('module initialisation', () => {
  it('calls sgMail.setApiKey with the SENDGRID_API_KEY env value', () => {
    expect(mockSetApiKey).toHaveBeenCalledWith('test-api-key')
  })
})

// ─── sendReply ────────────────────────────────────────────────────────────────

const baseOpts = {
  to: 'customer@example.com',
  subject: 'My issue',
  text: 'Here is my reply.',
  fromName: 'Support Team',
  messageId: 'reply-123-abc',
}

describe('sendReply', () => {
  it('calls sgMail.send with the correct recipient', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply(baseOpts)
    expect(mockSend.mock.calls[0][0].to).toBe('customer@example.com')
  })

  it('sends from SENDGRID_FROM_EMAIL with the provided fromName', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply(baseOpts)
    const { from } = mockSend.mock.calls[0][0]
    expect(from.email).toBe('support@testco.com')
    expect(from.name).toBe('Support Team')
  })

  it('sends the plain-text body', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply(baseOpts)
    expect(mockSend.mock.calls[0][0].text).toBe('Here is my reply.')
  })

  it('prepends "Re: " to the subject when not already present', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply({ ...baseOpts, subject: 'My issue' })
    expect(mockSend.mock.calls[0][0].subject).toBe('Re: My issue')
  })

  it('does not double-prepend "Re:" when subject already starts with it', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply({ ...baseOpts, subject: 'Re: My issue' })
    expect(mockSend.mock.calls[0][0].subject).toBe('Re: My issue')
  })

  it('sets the Message-ID header from opts.messageId', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply(baseOpts)
    expect(mockSend.mock.calls[0][0].headers['Message-ID']).toBe('<reply-123-abc>')
  })

  it('sets In-Reply-To header when opts.inReplyTo is provided', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply({ ...baseOpts, inReplyTo: 'original-message-id' })
    expect(mockSend.mock.calls[0][0].headers['In-Reply-To']).toBe('<original-message-id>')
  })

  it('omits In-Reply-To header when opts.inReplyTo is not provided', async () => {
    mockSend.mockResolvedValue([{}, {}])
    await sendReply(baseOpts)
    expect(mockSend.mock.calls[0][0].headers['In-Reply-To']).toBeUndefined()
  })

  it('propagates errors thrown by sgMail.send', async () => {
    mockSend.mockRejectedValue(new Error('SendGrid 403'))
    await expect(sendReply(baseOpts)).rejects.toThrow('SendGrid 403')
  })
})
