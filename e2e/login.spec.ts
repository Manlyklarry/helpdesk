/**
 * login.spec.ts
 *
 * Full coverage of the LoginPage — validation errors, auth errors, happy path,
 * loading state, aria-invalid attributes, and already-authenticated behaviour.
 *
 * These tests do NOT use saved auth state — each one starts from a fresh,
 * unauthenticated browser context.
 */

import { test, expect } from '@playwright/test'
import { gotoLogin, loginAsAdmin } from './helpers/auth'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLogin(page)
  })

  // -------------------------------------------------------------------------
  // Page structure
  // -------------------------------------------------------------------------

  test('renders the login form with all expected elements', async ({ page }) => {
    // The page H1 is "Helpdesk"; "Sign in" is a CardTitle (<div>), not a heading
    await expect(page.getByRole('heading', { name: 'Helpdesk' })).toBeVisible()
    await expect(
      page.getByText('Enter your email and password below'),
    ).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Happy path
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
  // Auth errors (server-side — credentials are syntactically valid but wrong)
  // -------------------------------------------------------------------------

  test('wrong password shows a root form error below the fields', async ({
    page,
  }) => {
    await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
    await page.getByLabel('Password').fill('completely-wrong-password')
    await page.getByRole('button', { name: 'Sign in' }).click()

    // Root error renders as a <p> below the password field — Better Auth
    // returns an error message that gets set via setError('root', …)
    const rootError = page.locator('form p.text-destructive').last()
    await expect(rootError, 'root error should appear for wrong password').toBeVisible()

    // Should NOT have navigated away
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
  // Client-side Zod validation
  // -------------------------------------------------------------------------

  test('empty email shows a validation error on the email field', async ({
    page,
  }) => {
    // Tab through email (triggering onTouched) without entering a value
    await page.getByLabel('Email').click()
    await page.getByLabel('Password').click() // blur email field

    await expect(
      page.getByText('Enter a valid email address'),
    ).toBeVisible()
  })

  test('invalid email format shows a validation error on the email field', async ({
    page,
  }) => {
    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').click() // blur to trigger onTouched

    await expect(
      page.getByText('Enter a valid email address'),
    ).toBeVisible()
  })

  test('empty password shows a validation error on the password field', async ({
    page,
  }) => {
    await page.getByLabel('Email').fill('user@example.com')
    await page.getByLabel('Password').click()
    // Click somewhere else to blur password
    await page.getByLabel('Email').click()

    await expect(page.getByText('Password is required')).toBeVisible()
  })

  test('both fields empty — submitting shows validation errors on both', async ({
    page,
  }) => {
    // Clicking submit with onTouched mode triggers validation for all fields
    await page.getByRole('button', { name: 'Sign in' }).click()

    await expect(
      page.getByText('Enter a valid email address'),
      'email error should appear',
    ).toBeVisible()
    await expect(
      page.getByText('Password is required'),
      'password error should appear',
    ).toBeVisible()

    // Page must not navigate
    await expect(page).toHaveURL('/login')
  })

  // -------------------------------------------------------------------------
  // aria-invalid attributes
  // -------------------------------------------------------------------------

  test('email input has aria-invalid="true" when there is an email error', async ({
    page,
  }) => {
    const emailInput = page.getByLabel('Email')
    // Initially no error — aria-invalid should be false or absent
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')

    await emailInput.click()
    await page.getByLabel('Password').click() // blur

    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('password input has aria-invalid="true" when there is a password error', async ({
    page,
  }) => {
    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true')

    // Fill a valid email, leave password blank, then blur password
    await page.getByLabel('Email').fill('user@example.com')
    await passwordInput.click()
    await page.getByLabel('Email').click() // blur password

    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
  })

  test('aria-invalid is cleared after a field is corrected', async ({ page }) => {
    const emailInput = page.getByLabel('Email')

    // Trigger the error
    await emailInput.fill('bad')
    await page.getByLabel('Password').click()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')

    // Fix the value
    await emailInput.fill('good@example.com')
    await page.getByLabel('Password').click()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'false')
  })

  // -------------------------------------------------------------------------
  // Loading / disabled state
  // -------------------------------------------------------------------------

  test('button shows "Signing in…" and is disabled while submitting', async ({
    page,
  }) => {
    // Use a slow-responding fake request by intercepting the sign-in endpoint
    // so we can catch the button state mid-flight.
    await page.route('**/api/auth/sign-in/email', async (route) => {
      // Delay the response by 2 s to give us time to assert the loading state
      await new Promise((resolve) => setTimeout(resolve, 2000))
      await route.continue()
    })

    await page.getByLabel('Email').fill(process.env.SEED_ADMIN_EMAIL!)
    await page.getByLabel('Password').fill(process.env.SEED_ADMIN_PASSWORD!)

    await page.getByRole('button', { name: 'Sign in' }).click()

    // While the delayed request is in-flight the button text changes to
    // "Signing in…" and the button is disabled.
    // Note: /sign in/i does NOT match "Signing in…" — use the exact loading
    // text for both assertions.
    await expect(
      page.getByRole('button', { name: 'Signing in…' }),
      'button should show loading text while submitting',
    ).toBeVisible()

    await expect(
      page.getByRole('button', { name: 'Signing in…' }),
      'button should be disabled while submitting',
    ).toBeDisabled()
  })

  // -------------------------------------------------------------------------
  // Already-authenticated user visits /login
  // -------------------------------------------------------------------------

  test('authenticated user visiting /login can still see the login page', async ({
    page,
  }) => {
    await loginAsAdmin(page)

    // Navigate directly to /login
    await page.goto('/login')

    // The LoginPage is not guarded — an authenticated user can still reach it.
    // The form should be visible (no forced redirect back to /).
    await expect(
      page.getByRole('button', { name: 'Sign in' }),
    ).toBeVisible()
  })
})
