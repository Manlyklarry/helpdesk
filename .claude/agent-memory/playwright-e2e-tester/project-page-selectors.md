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

## ProtectedRoute loading state

Text: `"Loading…"` (with ellipsis `…`) inside a `<span>` — only visible during `isPending`.
Locator: `page.getByText('Loading…')` — not tested directly, it's transient.
