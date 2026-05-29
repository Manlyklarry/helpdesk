import { type Page, expect } from '@playwright/test'

/** Navigate to /login and wait for the form to be ready. */
export async function gotoLogin(page: Page) {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
}

/**
 * Sign in as the seeded admin user and assert the page lands on /.
 * Calls gotoLogin first so it can be used after a signOut() — the full
 * navigation resets Better Auth's client state and prevents a brief
 * null-session flash that would cause ProtectedRoute to redirect back to /login.
 */
export async function loginAsAdmin(page: Page) {
  await gotoLogin(page)
  await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
  await page.getByLabel('Password').fill(process.env.SEED_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL('/')
}

/** Click the Sign out button and assert the page lands on /login. */
export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL('/login')
}
