import { test, expect } from '@playwright/test'
import path from 'path'
import { loginAsAdmin } from './helpers/auth'

const ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json')

/**
 * Navigate to /users and wait for the data table to finish loading.
 * Waits for a column header to confirm the skeleton has been replaced.
 */
async function gotoUsersPage(page: Parameters<typeof loginAsAdmin>[0]) {
  await page.goto('/users')
  await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible()
}

// ---------------------------------------------------------------------------
// Read — table and seeded rows
// ---------------------------------------------------------------------------

test.describe('Read: users table', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('shows the page heading and all column headers', async ({ page }) => {
    await gotoUsersPage(page)

    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /name/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /role/i })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /joined/i })).toBeVisible()
  })

  test('seeded admin user appears with a purple admin badge', async ({ page }) => {
    await gotoUsersPage(page)

    const adminRow = page
      .getByRole('row')
      .filter({ hasText: process.env.SEED_ADMIN_EMAIL! })

    await expect(adminRow).toBeVisible()

    const badge = adminRow.locator('span').filter({ hasText: 'admin' })
    await expect(badge).toBeVisible()
    await expect(badge).toHaveClass(/bg-purple-50/)
  })

  test('seeded agent user appears with a gray agent badge', async ({ page }) => {
    await gotoUsersPage(page)

    const agentRow = page
      .getByRole('row')
      .filter({ hasText: process.env.SEED_AGENT_EMAIL! })

    await expect(agentRow).toBeVisible()

    const badge = agentRow.locator('span').filter({ hasText: 'agent' })
    await expect(badge).toBeVisible()
    await expect(badge).toHaveClass(/bg-gray-100/)
  })
})

// ---------------------------------------------------------------------------
// Create — open modal, fill form, assert new row appears
// ---------------------------------------------------------------------------

test.describe('Create: add a new user', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('new user appears in the table after submitting the create form', async ({ page }) => {
    const timestamp = Date.now()
    const newName = `Test Agent ${timestamp}`
    const newEmail = `testagent${timestamp}@example.com`

    await gotoUsersPage(page)

    await page.getByRole('button', { name: 'Create user' }).click()
    await expect(page.getByRole('heading', { name: 'Create user' })).toBeVisible()

    await page.locator('#new-name').fill(newName)
    await page.locator('#new-email').fill(newEmail)
    await page.locator('#new-password').fill('SecurePass1!')

    // Scope to the modal to avoid matching the page-level "Create user" button
    await page.locator('.fixed').getByRole('button', { name: 'Create user' }).click()

    await expect(page.getByRole('heading', { name: 'Create user' })).not.toBeVisible()
    await expect(page.getByRole('cell', { name: newEmail })).toBeVisible()
    // Check the row — actions <td> also contains newName in the edit button's aria-label
    await expect(page.getByRole('row').filter({ hasText: newName })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Edit — click pencil on agent row, change name, assert update in table
// ---------------------------------------------------------------------------

test.describe('Edit: update an existing user', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('updated name appears in the table after saving the edit form', async ({ page }) => {
    const agentEmail = process.env.SEED_AGENT_EMAIL!
    const updatedName = `Updated Agent ${Date.now()}`

    await gotoUsersPage(page)

    const agentRow = page.getByRole('row').filter({ hasText: agentEmail })
    await agentRow.getByRole('button', { name: /edit/i }).click()

    await expect(page.getByRole('heading', { name: 'Edit user' })).toBeVisible()

    await page.locator('#edit-name').clear()
    await page.locator('#edit-name').fill(updatedName)

    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('heading', { name: 'Edit user' })).not.toBeVisible()
    // Check the row rather than a cell — the actions <td> also contains the
    // updated name in its edit button's aria-label, causing a strict-mode error
    await expect(page.getByRole('row').filter({ hasText: updatedName })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Delete — click trash on agent row, confirm, assert row is gone
// NOTE: runs last — removes the seeded agent (globalSetup re-seeds next run)
// ---------------------------------------------------------------------------

test.describe('Delete: remove an agent user', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('agent row disappears from the table after confirming deletion', async ({ page }) => {
    const agentEmail = process.env.SEED_AGENT_EMAIL!

    await gotoUsersPage(page)

    await expect(page.getByRole('cell', { name: agentEmail })).toBeVisible()

    const agentRow = page.getByRole('row').filter({ hasText: agentEmail })
    await agentRow.getByRole('button', { name: /delete/i }).click()

    await expect(page.getByRole('heading', { name: 'Delete user' })).toBeVisible()

    // exact: true avoids matching the trash buttons whose aria-label starts with "Delete …"
    await page.getByRole('button', { name: 'Delete', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Delete user' })).not.toBeVisible()
    await expect(page.getByRole('cell', { name: agentEmail })).not.toBeVisible()
  })
})
