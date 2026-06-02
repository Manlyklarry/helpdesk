/**
 * tickets.spec.ts
 *
 * E2E integration tests for the inbound email webhook (POST /api/webhooks/email).
 * These tests verify server-side behaviour that cannot be covered by component tests:
 *   - webhook API contracts (status codes, response shape)
 *   - email threading (reply appended to existing ticket, not a new row)
 *   - payload validation (invalid input is rejected gracefully)
 *
 * TicketsPage rendering (skeleton, badges, table rows, empty/error states) is
 * covered by the component test at client/src/pages/TicketsPage.test.tsx.
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json')

// Use 127.0.0.1 explicitly: on Windows, Playwright's request fixture resolves
// "localhost" to ::1 (IPv6) but Express listens on 127.0.0.1 (IPv4) only.
const SERVER_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'

function makePayload(overrides: {
  messageId: string
  subject?: string
  from?: string
  inReplyTo?: string
}) {
  return {
    from: overrides.from ?? 'Alice Example <alice@example.com>',
    to: ['support@helpdesk.local'],
    subject: overrides.subject ?? 'Test ticket subject',
    text: 'Body of the test email.',
    messageId: overrides.messageId,
    ...(overrides.inReplyTo ? { inReplyTo: overrides.inReplyTo } : {}),
  }
}

// ---------------------------------------------------------------------------
// Webhook API contracts
// ---------------------------------------------------------------------------

test.describe('Webhook: creates a new ticket', () => {
  test('valid payload returns { ok: true }', async ({ request }) => {
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({ messageId: `new-ticket-${Date.now()}` }),
    })

    expect(response.status()).toBe(200)
    expect((await response.json()).ok).toBe(true)
  })
})

test.describe('Webhook: bare email in from field', () => {
  test('plain email address (no "Name <>" wrapper) is accepted', async ({ request }) => {
    const ts = Date.now()
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({
        messageId: `bare-from-${ts}`,
        from: `bare${ts}@example.com`,
      }),
    })

    expect(response.status()).toBe(200)
    expect((await response.json()).ok).toBe(true)
  })
})

test.describe('Webhook: invalid payload is rejected gracefully', () => {
  test('missing required fields returns 200 with { ok: false }', async ({ request }) => {
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: { from: 'sender@example.com', subject: 'Incomplete', text: 'Body.' },
    })

    expect(response.status(), 'always 200 to prevent provider retry storms').toBe(200)
    expect((await response.json()).ok).toBe(false)
  })

  test('completely empty body returns 200 with { ok: false }', async ({ request }) => {
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: {},
    })

    expect(response.status()).toBe(200)
    expect((await response.json()).ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Email threading — requires real server + DB; cannot be a component test
// ---------------------------------------------------------------------------

test.describe('Webhook: email threading', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('reply with inReplyTo is appended to the existing ticket, not a new row', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const firstMessageId = `thread-parent-${ts}`
    const subject = `Webhook threading test ${ts}`

    // First email — creates the ticket
    const first = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({ messageId: firstMessageId, subject }),
    })
    expect(first.status()).toBe(200)
    expect((await first.json()).ok).toBe(true)

    // Reply — must be appended, not create a second ticket
    const reply = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({
        messageId: `thread-reply-${ts}`,
        subject: `Re: ${subject}`,
        inReplyTo: firstMessageId,
      }),
    })
    expect(reply.status()).toBe(200)
    expect((await reply.json()).ok).toBe(true)

    // Verify in the UI that only one row exists for the original subject
    await page.goto('/tickets')
    await expect(page.getByRole('columnheader', { name: /subject/i })).toBeVisible()

    await expect(
      page.getByRole('row').filter({ hasText: subject }),
      'reply must not create a second ticket row',
    ).toHaveCount(1)
  })
})
