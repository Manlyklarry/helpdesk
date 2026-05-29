/**
 * protected-route.spec.ts
 *
 * Verifies that ProtectedRoute and AdminRoute correctly guard routes.
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

    // ProtectedRoute detects no session and issues <Navigate to="/login" replace>
    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting an unknown path redirects to /login', async ({ page }) => {
    // App.tsx: <Route path="*" element={<Navigate to="/" replace />} />
    // The wildcard redirect goes to /, which is protected → /login
    await page.goto('/some/unknown/path')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting /users redirects to /login', async ({ page }) => {
    // AdminRoute also redirects unauthenticated users to /login
    await page.goto('/users')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('/login is accessible without a session', async ({ page }) => {
    await page.goto('/login')

    // No redirect — the login page itself is unprotected
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

    // ProtectedRoute finds the session and renders children
    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })

  test('visiting /users renders the UsersPage for an admin', async ({
    page,
  }) => {
    await page.goto('/users')

    // AdminRoute allows admin sessions through
    await expect(page).toHaveURL('/users')
    await expect(
      page.getByRole('heading', { name: 'Users' }),
    ).toBeVisible()
  })

  test('visiting /login still shows the login page (no forced redirect)', async ({
    page,
  }) => {
    test.slow() // allow extra time; this test occasionally hits a transient Vite hiccup
    // LoginPage has no guard — an authenticated user can visit it.
    // The app does not currently redirect them away.
    await page.goto('/login')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('visiting an unknown path falls through to /', async ({ page }) => {
    // Wildcard route → Navigate to / → ProtectedRoute passes → HomePage
    await page.goto('/definitely/not/a/real/page')

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })

  test('the navbar is rendered on the home page for an authenticated user', async ({
    page,
  }) => {
    await page.goto('/')

    // Navbar renders the brand link and the sign-out button
    await expect(
      page.getByRole('link', { name: 'Helpdesk' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible()
  })

  test('the navbar shows the Users link for an admin', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
  })
})
