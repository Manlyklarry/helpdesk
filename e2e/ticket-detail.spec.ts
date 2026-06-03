/**
 * ticket-detail.spec.ts
 *
 * E2E integration tests for the ticket detail page (/tickets/:id).
 *
 * These tests verify behaviour that requires a real server + DB:
 *   - Protected-route redirect for unauthenticated users
 *   - Ticket detail data rendered from DB (subject heading, sidebar sender)
 *   - Agent reply persisted and appearing in the message thread
 *   - Message count in the sidebar incrementing after a reply
 *
 * Rendering concerns (skeleton, badge colours, date formatting) are covered
 * by the component test at client/src/pages/TicketDetailPage.test.tsx.
 */

import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import path from 'path'

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json')

// Use 127.0.0.1 explicitly: on Windows, Playwright's request fixture resolves
// "localhost" to ::1 (IPv6) but Express listens on 127.0.0.1 (IPv4) only.
const SERVER_BASE = process.env.API_BASE_URL ?? 'http://127.0.0.1:3001'

// ---------------------------------------------------------------------------
// Helper: create a ticket via the email webhook, then navigate to its detail
// page by clicking its subject link on the tickets list.
// ---------------------------------------------------------------------------

async function createAndOpenTicket(
  request: APIRequestContext,
  page: Page,
  subject: string,
  messageId: string,
): Promise<void> {
  // 1. POST the webhook payload to create the ticket in the DB
  const response = await request.post(`${SERVER_BASE}/api/webhooks/email`, {
    data: {
      from: 'Alice Test <alice@test.com>',
      to: ['support@helpdesk.local'],
      subject,
      text: 'Test email body.',
      messageId,
    },
  })
  expect(response.status()).toBe(200)
  expect((await response.json()).ok).toBe(true)

  // 2. Navigate to the tickets list and click the subject link
  await page.goto('/tickets')
  const subjectLink = page.getByRole('link', { name: subject })
  await expect(subjectLink).toBeVisible()
  await subjectLink.click()

  // 3. Wait until the URL has settled on the detail page
  await expect(page).toHaveURL(/\/tickets\/\d+/)
}

// ---------------------------------------------------------------------------
// Protected route — no storageState, clean browser context
// ---------------------------------------------------------------------------

test.describe('Ticket detail: protected route', () => {
  test('unauthenticated user visiting /tickets/1 is redirected to /login', async ({
    page,
  }) => {
    // Navigate cold — no session cookies present
    await page.goto('/tickets/1')

    // ProtectedRoute detects no session and redirects to /login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Authenticated tests — all tests below use the saved admin session
// ---------------------------------------------------------------------------

test.describe('Ticket detail: renders real DB data', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('shows the ticket subject as h1 and the sender name in the sidebar', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const subject = `Detail render test ${ts}`
    const messageId = `detail-render-${ts}`

    await createAndOpenTicket(request, page, subject, messageId)

    // Subject must appear as the page heading
    await expect(
      page.getByRole('heading', { level: 1, name: subject }),
      'ticket subject should be the h1 heading',
    ).toBeVisible()

    // Sender name must appear in the sidebar "From" block.
    // "Alice Test" also renders in the message thread, so scope to the
    // parent <div> of the "From" label paragraph to avoid ambiguity.
    const fromBlock = page.locator('p', { hasText: /^From$/ }).locator('..')
    await expect(
      fromBlock.getByText('Alice Test'),
      'sender name should be visible in the sidebar From section',
    ).toBeVisible()
  })
})

test.describe('Ticket detail: agent reply flow', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('reply is persisted and appears in the message thread with an Agent pill', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const subject = `Reply persistence test ${ts}`
    const messageId = `reply-persist-${ts}`
    const replyText = `Agent reply at ${ts}`

    await createAndOpenTicket(request, page, subject, messageId)

    // Fill and submit the reply form
    await page.getByPlaceholder('Type your reply…').fill(replyText)
    await page.getByRole('button', { name: 'Send reply' }).click()

    // Wait for the pending state to clear — the button returns to its idle label
    await expect(page.getByRole('button', { name: 'Send reply' })).toBeVisible()

    // The reply body must appear in the message thread
    await expect(
      page.getByText(replyText),
      'reply text should appear in the message thread after submission',
    ).toBeVisible()

    // The "Agent" sender-type pill must be visible for the reply card.
    // The pill is a <span> rendered with exact text "Agent" (not "Assigned agent").
    // Use exact: true to avoid substring-matching the sidebar's "Assigned agent" label.
    await expect(
      page.getByText('Agent', { exact: true }).first(),
      'Agent sender pill should be visible next to the reply message card',
    ).toBeVisible()
  })

  test('message count in the sidebar increments from 1 to 2 after a reply', async ({
    request,
    page,
  }) => {
    const ts = Date.now()
    const subject = `Message count test ${ts}`
    const messageId = `msg-count-${ts}`

    await createAndOpenTicket(request, page, subject, messageId)

    // The sidebar renders a "Messages" label <p> followed by a sibling <p>
    // with the count.  Step from the label to its parent <div> to scope the
    // count lookup — avoids matching the "1" that may appear in ticket IDs etc.
    const messagesSection = page.locator('p', { hasText: /^Messages$/ }).locator('..')

    // Before the reply: the inbound webhook email is the only message → 1
    await expect(
      messagesSection.getByText('1'),
      'message count should start at 1 (the inbound webhook email)',
    ).toBeVisible()

    // Send the agent reply
    const replyText = `Count reply at ${ts}`
    await page.getByPlaceholder('Type your reply…').fill(replyText)
    await page.getByRole('button', { name: 'Send reply' }).click()

    // Wait for the reply to appear in the thread — proves the mutation +
    // query invalidation have completed and the UI has re-rendered.
    await expect(page.getByText(replyText)).toBeVisible()

    // After the reply: count should have incremented to 2
    await expect(
      messagesSection.getByText('2'),
      'message count should increment to 2 after agent reply',
    ).toBeVisible()
  })
})
