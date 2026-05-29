/**
 * auth.setup.ts
 *
 * Runs once before the test suite (via the "setup" project in playwright.config.ts).
 * Logs in as the seeded admin and persists the session cookies to
 * playwright/.auth/admin.json so that other test files can reuse the
 * authenticated state without re-authenticating on every test.
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'

export const ADMIN_AUTH_FILE = path.join(
  __dirname,
  '../playwright/.auth/admin.json',
)

setup('authenticate as admin', async ({ page }) => {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set. ' +
        'These are read from server/.env.test by global-setup.ts.',
    )
  }

  await page.goto('/login')

  // Wait for the login form to be ready before interacting
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()

  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Successful login navigates to the home page (Dashboard heading)
  await expect(page).toHaveURL('/')
  await expect(
    page.getByRole('heading', { name: 'Dashboard' }),
  ).toBeVisible()

  // Persist the browser's cookies + localStorage so dependent projects can
  // restore the session without logging in again.
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
