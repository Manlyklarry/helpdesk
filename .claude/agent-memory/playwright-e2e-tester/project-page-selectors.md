---
name: project-page-selectors
description: Confirmed accessible locators for all pages and components in the app
metadata:
  type: project
---

## LoginPage (`client/src/pages/LoginPage.tsx`)

| Element | Locator |
|---|---|
| Email input | `page.getByLabel('Email')` — `<Label htmlFor="email">Email</Label>` |
| Password input | `page.getByLabel('Password')` — `<Label htmlFor="password">Password</Label>` |
| Submit button (idle) | `page.getByRole('button', { name: 'Sign in' })` |
| Submit button (loading) | `page.getByRole('button', { name: 'Signing in…' })` — note ellipsis `…` not `...` |
| Email validation error | `page.getByText('Enter a valid email address')` |
| Password validation error | `page.getByText('Password is required')` |
| Root auth error | `page.locator('form p.text-destructive').last()` — last `<p class="text-destructive">` inside the form |
| Card heading | `page.getByRole('heading', { name: 'Sign in' })` |
| Card description | `page.getByText('Enter your email and password below')` |

## Navbar (`client/src/components/Navbar.tsx`)

| Element | Locator |
|---|---|
| Brand link | `page.getByRole('link', { name: 'Helpdesk' })` |
| Users link (admin only) | `page.getByRole('link', { name: 'Users' })` |
| User name span | `page.getByText(session.user.name)` — dynamic |
| Sign out button | `page.getByRole('button', { name: 'Sign out' })` |

## HomePage (`client/src/pages/HomePage.tsx`)

| Element | Locator |
|---|---|
| Dashboard heading | `page.getByRole('heading', { name: 'Dashboard' })` |

## UsersPage (`client/src/pages/UsersPage.tsx`)

| Element | Locator |
|---|---|
| Users heading | `page.getByRole('heading', { name: 'Users' })` |
| Card title | `page.getByText('All users')` |
| Column header: Name | `page.getByRole('columnheader', { name: /name/i })` — `<th>` has columnheader role |
| Column header: Email | `page.getByRole('columnheader', { name: /email/i })` |
| Column header: Role | `page.getByRole('columnheader', { name: /role/i })` |
| Column header: Joined | `page.getByRole('columnheader', { name: /joined/i })` |
| User row by email | `page.getByRole('cell', { name: email })` |
| Admin role badge | `page.getByRole('row').filter({ hasText: adminEmail }).locator('span').filter({ hasText: 'admin' })` — has class `bg-purple-50` |
| Agent role badge | `page.getByRole('row').filter({ hasText: agentEmail }).locator('span').filter({ hasText: 'agent' })` — has class `bg-gray-100` |
| Create user button | `page.getByRole('button', { name: 'Create user' })` |
| Edit button (per row) | `agentRow.getByRole('button', { name: /edit/i })` — aria-label is "Edit <name>" |
| Delete button (per row) | `agentRow.getByRole('button', { name: /delete/i })` — only present on agent rows |
| Loading state | skeleton rows visible while `isLoading` — no text to assert against |
| Empty state | `page.getByRole('cell', { name: 'No users found' })` |

## UsersPage — Create modal

| Element | Locator |
|---|---|
| Modal heading | `page.getByRole('heading', { name: 'Create user' })` |
| Name input | `page.locator('#new-name')` |
| Email input | `page.locator('#new-email')` |
| Password input | `page.locator('#new-password')` |
| Submit button | `page.getByRole('button', { name: 'Create user' })` (same text as the modal heading, but distinct button) |
| Cancel button | `page.getByRole('button', { name: 'Cancel' })` |

## UsersPage — Edit modal

| Element | Locator |
|---|---|
| Modal heading | `page.getByRole('heading', { name: 'Edit user' })` |
| Name input | `page.locator('#edit-name')` |
| Email input | `page.locator('#edit-email')` |
| Role select | `page.locator('#edit-role')` |
| Password input | `page.locator('#edit-password')` |
| Submit button | `page.getByRole('button', { name: 'Save changes' })` |
| Cancel button | `page.getByRole('button', { name: 'Cancel' })` |

## UsersPage — Delete confirmation modal

| Element | Locator |
|---|---|
| Modal heading | `page.getByRole('heading', { name: 'Delete user' })` |
| Confirm button | `page.getByRole('button', { name: 'Delete' })` — variant="destructive" |
| Cancel button | `page.getByRole('button', { name: 'Cancel' })` |

## TicketsPage (`client/src/pages/TicketsPage.tsx`)

| Element | Locator |
|---|---|
| Tickets heading | `page.getByRole('heading', { name: 'Tickets' })` |
| Card title | `page.getByText('All tickets')` |
| Column header: Subject | `page.getByRole('columnheader', { name: /subject/i })` — use this to confirm skeleton is gone |
| Column header: Sender | `page.getByRole('columnheader', { name: /sender/i })` |
| Column header: Category | `page.getByRole('columnheader', { name: /category/i })` |
| Column header: Status | `page.getByRole('columnheader', { name: /status/i })` |
| Column header: Date | `page.getByRole('columnheader', { name: /date/i })` |
| Ticket row by subject | `page.getByRole('cell', { name: subject })` |
| Sender email | `page.getByText(fromEmail)` — rendered as a `<div>` inside the Sender `<td>` |
| Empty state | `page.getByRole('cell', { name: 'No tickets yet' })` |
| Status badge | inline `<span>` with class `bg-blue-50` (open) / `bg-green-50` (resolved) / `bg-gray-100` (closed) |
| Category badge | inline `<span>` with class `bg-purple-50` (technical) / `bg-amber-50` (refund) / `bg-gray-100` (general) |

## Webhook (`POST /api/webhooks/email` — test server direct call)

Endpoint lives at `http://localhost:3001/api/webhooks/email` — bypass the Vite proxy and call the
test server directly with Playwright's `request` fixture.  Requires no authentication.

| Case | Expected |
|---|---|
| Valid payload | `{ ok: true }`, status 200 |
| Invalid/missing fields | `{ ok: false }`, status 200 (retry-storm prevention) |
| `inReplyTo` set to existing `messageId` | appends to existing ticket, no new row in `/tickets` |
| Bare email `from` (no "Name <>") | `{ ok: true }`, stored `fromEmail` equals the bare address |

## TicketDetailPage (`client/src/pages/TicketDetailPage.tsx`)

| Element | Locator |
|---|---|
| Page heading (subject) | `page.getByRole('heading', { level: 1, name: subject })` |
| Sender name (sidebar) | `page.getByText('Alice Test')` — rendered in `<p class="text-sm font-medium">` |
| Reply textarea | `page.getByPlaceholder('Type your reply…')` |
| Send reply button (idle) | `page.getByRole('button', { name: 'Send reply' })` |
| Send reply button (pending) | `page.getByRole('button', { name: 'Sending…' })` — note `…` |
| Customer sender pill | `page.getByText('Customer', { exact: true })` — `<span class="bg-gray-100 text-gray-600">` |
| Agent sender pill | `page.getByText('Agent', { exact: true })` — `<span class="bg-blue-100 text-blue-700">` |
| Messages count (sidebar) | `page.locator('div').filter({ hasText: /^Messages$/ }).getByText('1')` — filter to parent div |
| Back to tickets button | `page.getByRole('button', { name: /back to tickets/i })` — uses `navigate('/tickets')` |
| Not found message | `page.getByText('Ticket not found')` |

Notes:
- `getByText('Agent', { exact: true })` needed because "Assigned agent" label is also on the page
- `page.locator('div').filter({ hasText: /^Messages$/ })` anchors to the exact label paragraph's parent `<div>`
- The sidebar count updates reactively after `queryClient.invalidateQueries` completes on reply success

## ProtectedRoute loading state

Text: `"Loading…"` (with ellipsis `…`) inside a `<span>` — only visible during `isPending`.
Locator: `page.getByText('Loading…')` — not tested directly, it's transient.
