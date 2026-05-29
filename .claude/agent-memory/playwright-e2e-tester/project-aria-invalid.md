---
name: project-aria-invalid
description: How LoginPage sets and clears aria-invalid on shadcn Input components
metadata:
  type: project
---

## How aria-invalid works in LoginPage

The `Input` receives `aria-invalid={!!errors.email}` (and same for password).

- When there is NO error: `aria-invalid` is `"false"` (React serialises `false` as the string `"false"`, not absent)
- When there IS an error: `aria-invalid` is `"true"`

### Assertion pattern
```typescript
// Error present
await expect(input).toHaveAttribute('aria-invalid', 'true')

// No error — use 'false', not absence check
await expect(input).toHaveAttribute('aria-invalid', 'false')
// OR: await expect(input).not.toHaveAttribute('aria-invalid', 'true')
```

## Trigger timing — `mode: 'onTouched'`

The form uses `mode: 'onTouched'`, so validation errors appear after a field is blurred (not on every keystroke).

To trigger a validation error in a test:
1. Click into the field
2. Click somewhere else (e.g. another field) to blur it
3. Then assert the error text / aria-invalid

Clicking the submit button also triggers validation for all fields simultaneously.

## Root error
Set via `setError('root', { message: error.message ?? 'Invalid email or password.' })` after a failed Better Auth sign-in.
Rendered as `<p className="text-sm text-destructive">{errors.root.message}</p>` — below the password field, inside `<form>`.

Selector: `page.locator('form p.text-destructive').last()` — uses `.last()` because both field errors also use `text-xs text-destructive`.
