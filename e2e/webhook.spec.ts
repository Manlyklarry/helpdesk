/**
 * webhook.spec.ts
 *
 * E2E tests for the inbound email webhook at POST /api/webhooks/email.
 *
 * The webhook itself is unauthenticated — tests use Playwright's `request`
 * fixture (APIRequestContext) to call the test server directly on port 3001.
 * UI verification steps (checking the tickets table) use the saved admin
 * session from auth.setup.ts via storageState.
 *
 * Each test uses a unique messageId derived from the test name + Date.now()
 * to avoid cross-test collisions in the shared helpdesk_test database.
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json')

// Direct base URL for the test server — bypasses Vite's /api proxy so the
// webhook receives requests even when the browser is not involved.
// Loaded from API_BASE_URL in server/.env.test (127.0.0.1 avoids IPv6 issues on Windows).
const SERVER_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for the tickets table to finish loading (skeleton → real data). */
async function gotoTicketsPage(page: Parameters<typeof import('./helpers/auth').loginAsAdmin>[0]) {
  await page.goto('/tickets')
  // Wait for a column header — confirms the skeleton has been replaced by real content
  await expect(page.getByRole('columnheader', { name: /subject/i })).toBeVisible()
}

/** Build a minimal valid inbound-email payload. */
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
// Scenario 1 — Creates a new ticket
// ---------------------------------------------------------------------------

test.describe('Webhook: creates a new ticket', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('POST valid payload returns { ok: true } and ticket appears in the table', async ({
    request,
    page,
  }) => {
    const messageId = `new-ticket-${Date.now()}`
    const subject = `Webhook test — new ticket ${Date.now()}`

    // Call the webhook directly on the test server
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({ messageId, subject }),
    })

    expect(response.status(), 'webhook should return 200').toBe(200)
    const body = await response.json()
    expect(body.ok, 'response body should have ok: true').toBe(true)

    // Verify the ticket appears in the UI
    await gotoTicketsPage(page)

    // The subject is rendered in a <td> — assert it is visible in the table
    await expect(
      page.getByRole('cell', { name: subject }),
      'new ticket subject should appear in the tickets table',
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Scenario 2 — Threads a reply (only one ticket is created)
// ---------------------------------------------------------------------------

test.describe('Webhook: threads a reply onto an existing ticket', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('reply with inReplyTo does not create a second ticket', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const firstMessageId = `thread-parent-${ts}`
    const replyMessageId = `thread-reply-${ts}`
    const subject = `Webhook test — threading ${ts}`

    // 1. POST the original email — creates a new ticket
    const firstResponse = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({ messageId: firstMessageId, subject }),
    })
    expect(firstResponse.status()).toBe(200)
    expect((await firstResponse.json()).ok).toBe(true)

    // 2. POST a reply that references the first message
    const replyResponse = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({
        messageId: replyMessageId,
        subject: `Re: ${subject}`,
        inReplyTo: firstMessageId,
      }),
    })
    expect(replyResponse.status()).toBe(200)
    expect((await replyResponse.json()).ok).toBe(true)

    // 3. Navigate to /tickets and count rows matching the original subject.
    //    A threaded reply must NOT create a second row — only one ticket.
    await gotoTicketsPage(page)

    const matchingRows = page.getByRole('row').filter({ hasText: subject })
    // Exactly one row should contain the original subject
    await expect(
      matchingRows,
      'reply should be appended to the existing thread, not create a new ticket',
    ).toHaveCount(1)
  })
})

// ---------------------------------------------------------------------------
// Scenario 3 — Invalid payload returns { ok: false }
// ---------------------------------------------------------------------------

test.describe('Webhook: invalid payload is rejected gracefully', () => {
  test('missing required fields returns 200 with { ok: false }', async ({
    request,
  }) => {
    // Omit `to` and `messageId` — both are required by the Zod schema
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: {
        from: 'sender@example.com',
        subject: 'Incomplete payload',
        text: 'Body text.',
        // to: missing
        // messageId: missing
      },
    })

    // Server always returns 200 to prevent retry-storm from webhook providers
    expect(response.status(), 'status should be 200 even on bad input').toBe(200)
    const body = await response.json()
    expect(body.ok, 'ok should be false for invalid payload').toBe(false)
  })

  test('completely empty body returns 200 with { ok: false }', async ({
    request,
  }) => {
    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: {},
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Scenario 4 — Bare email address in `from` field (no "Name <>" wrapper)
// ---------------------------------------------------------------------------

test.describe('Webhook: bare email in from field', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('plain email address in from is accepted and ticket is created', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const messageId = `bare-from-${ts}`
    const subject = `Webhook test — bare from ${ts}`
    // Pass a bare email with no "Name <>" wrapper
    const bareFrom = `bare${ts}@example.com`

    const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
      data: makePayload({ messageId, subject, from: bareFrom }),
    })

    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.ok, 'bare email in from should be accepted').toBe(true)

    // Verify the ticket is visible in the UI
    await gotoTicketsPage(page)

    await expect(
      page.getByRole('cell', { name: subject }),
      'ticket created from bare-email from should appear in the table',
    ).toBeVisible()

    // The sender cell renders fromEmail — confirm the bare address was stored correctly.
    // getByText matches both the fromName and fromEmail divs (same value for bare emails),
    // so use .first() to avoid a strict-mode multi-match error.
    await expect(
      page.getByText(bareFrom).first(),
      'bare from email should appear in the sender column',
    ).toBeVisible()
  })
})
