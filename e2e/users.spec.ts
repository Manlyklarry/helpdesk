/**
 * users.spec.ts
 *
 * E2E tests for the UsersPage (/users) — table content, role badges, and
 * access-control behaviour for admin, agent, and unauthenticated users.
 *
 * Test groups:
 *   - "Admin access"         — uses saved admin storageState (read-only, no sign-out)
 *   - "Agent access control" — signs in fresh as agent; redirected to /
 *   - "Unauthenticated"      — no session; redirected to /login
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const ADMIN_AUTH_FILE = path.join(
  __dirname,
  '../playwright/.auth/admin.json',
)

// ---------------------------------------------------------------------------
// Admin — happy path
// ---------------------------------------------------------------------------

test.describe('Admin access to /users', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('page heading and card title are visible', async ({ page }) => {
    await page.goto('/users')

    await expect(page).toHaveURL('/users')
    await expect(
      page.getByRole('heading', { name: 'Users' }),
    ).toBeVisible()
    await expect(page.getByText('All users')).toBeVisible()
  })

  test('table has the expected column headers', async ({ page }) => {
    await page.goto('/users')

    // All four column headers should be present (case-insensitive match via
    // getByRole is not available on <th>, so use getByText with exact:false)
    await expect(page.getByText('Name', { exact: false })).toBeVisible()
    await expect(page.getByText('Email', { exact: false })).toBeVisible()
    await expect(page.getByText('Role', { exact: false })).toBeVisible()
    await expect(page.getByText('Joined', { exact: false })).toBeVisible()
  })

  test('seeded admin user row is visible with the correct email', async ({
    page,
  }) => {
    const adminEmail = process.env.SEED_ADMIN_EMAIL!

    await page.goto('/users')

    // Wait for the loading state to clear and the table to render
    await expect(page.getByText('Loading…')).not.toBeVisible()

    await expect(
      page.getByRole('cell', { name: adminEmail }),
      'admin email should appear in the table',
    ).toBeVisible()
  })

  test('admin user row shows a purple "admin" role badge', async ({ page }) => {
    await page.goto('/users')

    await expect(page.getByText('Loading…')).not.toBeVisible()

    // The RoleBadge for admin renders with text "admin" inside a purple <span>
    // Locate the badge by its text and verify it has the purple styling class
    const adminBadge = page
      .getByRole('row')
      .filter({ hasText: process.env.SEED_ADMIN_EMAIL! })
      .locator('span')
      .filter({ hasText: 'admin' })

    await expect(adminBadge, 'admin badge should be visible').toBeVisible()
    // The purple badge has bg-purple-50 applied — verify via class attribute
    await expect(adminBadge).toHaveClass(/bg-purple-50/)
  })

  test('seeded agent user row is visible with the correct email', async ({
    page,
  }) => {
    const agentEmail = process.env.SEED_AGENT_EMAIL!

    await page.goto('/users')

    await expect(page.getByText('Loading…')).not.toBeVisible()

    await expect(
      page.getByRole('cell', { name: agentEmail }),
      'agent email should appear in the table',
    ).toBeVisible()
  })

  test('agent user row shows a gray "agent" role badge', async ({ page }) => {
    await page.goto('/users')

    await expect(page.getByText('Loading…')).not.toBeVisible()

    // The RoleBadge for agent renders with text "agent" inside a gray <span>
    const agentBadge = page
      .getByRole('row')
      .filter({ hasText: process.env.SEED_AGENT_EMAIL! })
      .locator('span')
      .filter({ hasText: 'agent' })

    await expect(agentBadge, 'agent badge should be visible').toBeVisible()
    // The gray badge has bg-gray-100 applied — verify via class attribute
    await expect(agentBadge).toHaveClass(/bg-gray-100/)
  })

  test('the navbar shows the "Users" link for an admin', async ({ page }) => {
    await page.goto('/users')

    await expect(
      page.getByRole('link', { name: 'Users' }),
    ).toBeVisible()
  })

  test('the navbar brand link is present on the users page', async ({
    page,
  }) => {
    await page.goto('/users')

    await expect(
      page.getByRole('link', { name: 'Helpdesk' }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Agent — non-admin redirected to /
// ---------------------------------------------------------------------------

test.describe('Agent access control', () => {
  // No storageState — sign in fresh as an agent below

  test('agent visiting /users is redirected to /', async ({ page }) => {
    const agentEmail = process.env.SEED_AGENT_EMAIL!
    const agentPassword = process.env.SEED_AGENT_PASSWORD!

    // Sign in as agent
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await page.getByLabel('Email').fill(agentEmail)
    await page.getByLabel('Password').fill(agentPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Agent has ProtectedRoute access — should land on /
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()

    // Now navigate to /users — AdminRoute should redirect back to /
    await page.goto('/users')

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Unauthenticated — redirected to /login
// ---------------------------------------------------------------------------

test.describe('Unauthenticated access to /users', () => {
  // No storageState — fresh browser context with no session

  test('unauthenticated user visiting /users is redirected to /login', async ({
    page,
  }) => {
    await page.goto('/users')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })
})
