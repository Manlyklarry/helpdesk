/**
 * protected-route.spec.ts
 *
 * Verifies that ProtectedRoute and AdminRoute correctly guard routes using
 * real Better Auth sessions. Navbar rendering and role-based link visibility
 * are covered by component tests.
 *
 * Two test groups:
 *   - "Unauthenticated" — default context, no saved session state
 *   - "Authenticated"   — uses the saved admin session from auth.setup.ts
 */

import { test, expect } from '@playwright/test'
import path from 'path'

const ADMIN_AUTH_FILE = path.join(
  __dirname,
  '../playwright/.auth/admin.json',
)

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Unauthenticated access', () => {
  // No storageState — browser starts with no session cookies

  test('visiting / redirects to /login', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting an unknown path redirects to /login', async ({ page }) => {
    await page.goto('/some/unknown/path')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting /users redirects to /login', async ({ page }) => {
    await page.goto('/users')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('/login is accessible without a session', async ({ page }) => {
    await page.goto('/login')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Authenticated access (admin role)
// ---------------------------------------------------------------------------

test.describe('Authenticated access', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })

  test('visiting / renders the HomePage', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })

  test('visiting /users renders the UsersPage for an admin', async ({
    page,
  }) => {
    await page.goto('/users')

    await expect(page).toHaveURL('/users')
    await expect(
      page.getByRole('heading', { name: 'Users' }),
    ).toBeVisible()
  })

  test('visiting /login still shows the login page (no forced redirect)', async ({
    page,
  }) => {
    test.slow()
    await page.goto('/login')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting an unknown path falls through to /', async ({ page }) => {
    await page.goto('/definitely/not/a/real/page')

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })
})
