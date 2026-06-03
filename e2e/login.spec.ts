/**
 * login.spec.ts
 *
 * E2E tests for login that require a real Better Auth server.
 * Client-side Zod validation, aria-invalid attributes, button loading state,
 * and form rendering are covered by component tests (LoginPage.test.tsx).
 */

import { test, expect } from '@playwright/test'
import { gotoLogin, loginAsAdmin } from './helpers/auth'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLogin(page)
  })

  // -------------------------------------------------------------------------
  // Happy path — real Better Auth sign-in
  // -------------------------------------------------------------------------

  test('valid credentials redirect to /', async ({ page }) => {
    const email = process.env.SEED_ADMIN_EMAIL!
    const password = process.env.SEED_ADMIN_PASSWORD!

    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(page).toHaveURL('/')
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Auth errors — server-side rejection (credentials are syntactically valid)
  // -------------------------------------------------------------------------

  test('wrong password shows a root form error below the fields', async ({
    page,
  }) => {
    await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
    await page.getByLabel('Password').fill('completely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    const rootError = page.locator('form p.text-destructive').last()
    await expect(rootError, 'root error should appear for wrong password').toBeVisible()

    await expect(page).toHaveURL('/login')
  })

  test('non-existent email shows a root form error', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@nowhere.invalid')
    await page.getByLabel('Password').fill('SomePassword1!')
    await page.getByRole('button', { name: 'Sign in' }).click()

    const rootError = page.locator('form p.text-destructive').last()
    await expect(rootError, 'root error should appear for unknown email').toBeVisible()

    await expect(page).toHaveURL('/login')
  })

  // -------------------------------------------------------------------------
  // Already-authenticated user — real session required
  // -------------------------------------------------------------------------

  test('authenticated user visiting /login can still see the login page', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    await page.goto('/login')

    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })
})
