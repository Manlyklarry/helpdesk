---
name: project-auth-patterns
description: Seeded admin account, storageState usage, how authenticated vs unauthenticated tests are separated
metadata:
  type: project
---

## Seeded accounts
### Admin
- Email: `admin@test.local` (from `SEED_ADMIN_EMAIL` in `server/.env.test`)
- Password: `TestAdmin_Pass_456!` (from `SEED_ADMIN_PASSWORD` in `server/.env.test`)
- Role: `admin`
- Session state saved to `playwright/.auth/admin.json` by `auth.setup.ts`

### Agent
- Email: `agent@test.local` (from `SEED_AGENT_EMAIL` in `server/.env.test`)
- Password: `TestAgent_Pass_456!` (from `SEED_AGENT_PASSWORD` in `server/.env.test`)
- Role: `agent`
- No storageState file — sign in inline when needed

Sign-up is disabled in production auth; accounts are seeded by `server/prisma/seed.ts`.
The seed **deletes and recreates** both accounts on every run (upsert-by-delete pattern) so credentials always match `.env.test` even if the DB was previously seeded with different values.

## auth.setup.ts
Location: `e2e/auth.setup.ts`
- Uses `test as setup` from `@playwright/test`
- Navigates to `/login`, fills form, waits for redirect to `/`, then calls `page.context().storageState({ path: ADMIN_AUTH_FILE })`
- `ADMIN_AUTH_FILE = path.join(__dirname, '../playwright/.auth/admin.json')`
- This path constant is exported and imported by `protected-route.spec.ts` and `logout.spec.ts`

## Using saved session in a test file
Two patterns used:

### Whole describe block is authenticated
```typescript
test.describe('Authenticated tests', () => {
  test.use({ storageState: ADMIN_AUTH_FILE })
  // all tests in here start logged in
})
```

### Mix of authenticated + unauthenticated in one file
Use separate `test.describe` blocks — one with `test.use({ storageState })` and one without. See `protected-route.spec.ts`.

## login.spec.ts
Does NOT use storageState — every test starts unauthenticated. The "already authenticated" test logs in programmatically within the test itself.

**Why:** Login tests must validate the form in isolation. Using a pre-authenticated state would skip the auth flow entirely.
