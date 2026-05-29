---
name: project-test-infrastructure
description: Playwright config layout, webServer commands, auth state path, env loading, test script
metadata:
  type: project
---

## Config file
`playwright.config.ts` is at the project root (not inside `client/`).

**testDir:** `./e2e/` (project root)
**baseURL:** `http://localhost:5174`
**workers:** 1 (serial — database state shared across tests)
**globalSetup:** `./e2e/global-setup.ts` (runs DB migrate + seed before any tests)

## webServer block
Two servers are started:
1. `bun --cwd server run start:test` → `http://localhost:3001/api/health` (reads `server/.env.test`)
2. `bun --cwd client run dev` → `http://localhost:5174` with `VITE_PORT=5174` + `VITE_API_PORT=3001`

`reuseExistingServer: !process.env.CI` — servers are not restarted locally if already running.

## Test projects (order matters — setup runs first)
- `setup` — matches `auth.setup.ts`, no dependencies
- `login` — matches `login.spec.ts`, depends on setup
- `protected-routes` — matches `protected-route.spec.ts`, depends on setup
- `logout` — matches `logout.spec.ts`, depends on setup
- `chromium` — catches remaining specs, depends on setup

## Auth state file
`playwright/.auth/admin.json` — created by `auth.setup.ts`, git-ignored via `.gitignore` entry `playwright/.auth/`

## Environment variables for tests
`playwright.config.ts` reads `server/.env.test` at startup and populates `process.env.*` for all test files.
Key vars: `SEED_ADMIN_EMAIL=admin@test.local`, `SEED_ADMIN_PASSWORD=TestAdmin_Pass_456!`

**Why:** test credentials live in `server/.env.test` alongside the test DB config. Loading them in the config avoids duplicating the parse logic and makes them available to every spec via `process.env.*` without any imports.

**How to apply:** When adding new test files that need credentials, just use `process.env.SEED_ADMIN_EMAIL` / `process.env.SEED_ADMIN_PASSWORD` — they will already be set.
