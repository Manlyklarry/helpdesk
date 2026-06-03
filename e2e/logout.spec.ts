/**
 * logout.spec.ts
 *
 * Verifies the sign-out flow using real Better Auth session destruction.
 * UI state changes (button disappearing, form field visibility) are covered
 * by component tests.
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

  test('can sign in again after signing out', async ({ page }) => {
    await signOut(page)

    await loginAsAdmin(page)

    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })
})
