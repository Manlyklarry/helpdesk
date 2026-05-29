/**
 * logout.spec.ts
 *
 * Verifies the sign-out flow — session is cleared, protected routes become
 * inaccessible, and the login page is reachable again after signing out.
 *
 * Each test signs in fresh via loginAsAdmin() rather than reusing storageState.
 * Reason: authClient.signOut() deletes the DB session record. If multiple
 * tests share the same storageState cookie, the first sign-out invalidates
 * the token in PostgreSQL and all subsequent tests see an unauthenticated
 * browser even though the cookie is still present.
 */

import { test, expect } from '@playwright/test'
import { loginAsAdmin, signOut } from './helpers/auth'

test.describe('Sign out', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  test('clicking "Sign out" navigates to /login', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible()

    await signOut(page)
  })

  test('after signing out, visiting / redirects to /login', async ({
    page,
  }) => {
    await signOut(page)

    await page.goto('/')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('after signing out, visiting /users redirects to /login', async ({
    page,
  }) => {
    await signOut(page)

    await page.goto('/users')

    await expect(page).toHaveURL('/login')
  })

  test('after signing out, /login is accessible and functional', async ({
    page,
  }) => {
    await signOut(page)

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('can sign in again after signing out', async ({ page }) => {
    await signOut(page)

    // loginAsAdmin calls page.goto('/login') which resets Better Auth's client
    // state — necessary after signOut() to prevent a brief null-session flash
    // that causes ProtectedRoute to redirect back to /login.
    await loginAsAdmin(page)

    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Session cleared in browser
  // -------------------------------------------------------------------------

  test('sign out clears the session — "Sign out" button disappears', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'Sign out' }),
    ).toBeVisible()

    await signOut(page)

    // The Navbar is not rendered on /login, so "Sign out" must not be visible
    await expect(
      page.getByRole('button', { name: 'Sign out' }),
    ).not.toBeVisible()
  })
})
