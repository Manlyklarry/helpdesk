/**
 * logout.spec.ts
 *
 * Verifies the sign-out flow — session is cleared, protected routes become
 * inaccessible, and the login page is reachable again after signing out.
 *
 * Each test signs in fresh via the UI rather than reusing storageState.
 * Reason: authClient.signOut() deletes the DB session record. If multiple
 * tests share the same storageState cookie, the first sign-out invalidates
 * the token in PostgreSQL and all subsequent tests see an unauthenticated
 * browser even though the cookie is still present.
 */

import { test, expect, type Page } from '@playwright/test'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.SEED_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

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

    await page.getByRole('button', { name: 'Sign out' }).click()

    await expect(page).toHaveURL('/login')
  })

  test('after signing out, visiting / redirects to /login', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    await page.goto('/')

    await expect(page).toHaveURL('/login')
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('after signing out, visiting /users redirects to /login', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    await page.goto('/users')

    await expect(page).toHaveURL('/login')
  })

  test('after signing out, /login is accessible and functional', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })

  test('can sign in again after signing out', async ({ page }) => {
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    // Full navigation resets the Better Auth client state; without this, the
    // session established by the second signIn may not propagate before
    // ProtectedRoute renders, causing an immediate redirect back to /login.
    await page.goto('/login')

    await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
    await page.getByLabel('Password').fill(process.env.SEED_ADMIN_PASSWORD!)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/')
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

    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL('/login')

    // The Navbar is not rendered on /login, so "Sign out" must not be visible
    await expect(
      page.getByRole('button', { name: 'Sign out' }),
    ).not.toBeVisible()
  })
})
