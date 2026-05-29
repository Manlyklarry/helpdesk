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
| Column header: Name | `page.getByText('Name', { exact: false })` — `<th>` is not a role |
| Column header: Email | `page.getByText('Email', { exact: false })` |
| Column header: Role | `page.getByText('Role', { exact: false })` |
| Column header: Joined | `page.getByText('Joined', { exact: false })` |
| User row by email | `page.getByRole('cell', { name: email })` |
| Admin role badge | `page.getByRole('row').filter({ hasText: adminEmail }).locator('span').filter({ hasText: 'admin' })` — has class `bg-purple-50` |
| Agent role badge | `page.getByRole('row').filter({ hasText: agentEmail }).locator('span').filter({ hasText: 'agent' })` — has class `bg-gray-100` |
| Loading state | `page.getByText('Loading…')` — disappears once data loads |
| Empty state | `page.getByRole('cell', { name: 'No users found' })` |

## ProtectedRoute loading state

Text: `"Loading…"` (with ellipsis `…`) inside a `<span>` — only visible during `isPending`.
Locator: `page.getByText('Loading…')` — not tested directly, it's transient.
