# Helpdesk — Claude Project Memory

## Project Overview

An AI-powered ticket management system that receives support emails, classifies them, and helps agents respond faster using AI-generated summaries and suggested replies.

See `project-scope.md` for full feature list and `implementation-plan.md` for the phased build plan.

## Tech Stack

| Layer      | Choice                          |
|------------|---------------------------------|
| Runtime    | Bun                             |
| Frontend   | React 19 + TypeScript + Vite 8  |
| Backend    | Express 5 + TypeScript          |
| Styling    | Tailwind CSS v4 + shadcn/ui     |
| Database   | PostgreSQL + Prisma             |
| Auth       | Better Auth (email/password, database sessions via PostgreSQL) |
| AI         | Anthropic Claude API            |
| Email      | Resend (inbound webhook + outbound) |

See `tech-stack.md` for rationale.

## Project Structure

```
helpdesk/
├── dev.ts                  # Spawns client + server concurrently
├── package.json            # Bun workspace root
├── tsconfig.json           # Root tsconfig (bun-types)
├── .env.example            # All required environment variables (template)
├── playwright.config.ts    # Playwright E2E config (Chromium, ports 3001/5174, globalSetup)
├── e2e/                    # E2E test files
│   ├── global-setup.ts     # Runs migrate:deploy + seed against helpdesk_test
│   ├── run-setup.ts        # Standalone setup runner (used by test:db:setup)
│   └── tsconfig.json
├── client/                 # React + Vite frontend
│   ├── components.json     # shadcn/ui config (style: base-nova, baseColor: neutral)
│   ├── src/
│   │   ├── App.tsx         # Routes + ProtectedRoute (authClient.useSession)
│   │   ├── main.tsx
│   │   ├── index.css       # Tailwind v4 + shadcn CSS variable theme
│   │   ├── components/
│   │   │   └── ui/         # shadcn/ui generated components (button, card, input, label)
│   │   ├── lib/
│   │   │   ├── auth-client.ts  # Better Auth client (createAuthClient)
│   │   │   └── utils.ts        # cn() helper (clsx + tailwind-merge)
│   │   └── pages/
│   │       ├── LoginPage.tsx   # Login form (react-hook-form + zod + shadcn)
│   │       └── HomePage.tsx
│   ├── tsconfig.app.json   # Includes @/* → src/* path alias
│   └── vite.config.ts      # Tailwind plugin + @/* alias + /api proxy → localhost:3000
└── server/                 # Express backend
    ├── .env                # Server environment variables (git-ignored)
    ├── .env.test           # Test environment variables (git-ignored)
    ├── prisma/
    │   └── schema.prisma   # Prisma schema and data models
    ├── prisma.config.ts    # Prisma v7 config (datasource URL, schema path)
    ├── src/
    │   ├── index.ts        # App entry: cors, auth handler, json, router
    │   ├── lib/
    │   │   ├── db.ts       # Prisma client singleton (PrismaPg adapter)
    │   │   └── auth.ts     # Better Auth instance (email/password, role field)
    │   └── routes/
    │       └── index.ts    # GET /api/health
    └── tsconfig.json
```

## Running the Project

```bash
# Install all workspace dependencies
bun install

# Start both client and server
bun run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3000
- API health: http://localhost:3000/api/health

The Vite dev server proxies all `/api/*` requests to the Express server — no CORS issues in development.

## E2E Testing

Playwright is configured at the project root with an isolated `helpdesk_test` PostgreSQL database.

```bash
bun run test:db:setup     # Seed test DB (run once before first test run)
bun run test:e2e          # Run all E2E tests (headless)
bun run test:e2e:ui       # Playwright UI mode
```

- Test client: http://localhost:5174 (Vite with `VITE_PORT=5174`)
- Test server: http://localhost:3001 (Express with `server/.env.test`)
- Test database: `helpdesk_test` (separate from dev `helpdesk` DB)
- `globalSetup` in `e2e/global-setup.ts` runs `migrate:deploy` then `seed` before each test run
- Seeded admin: credentials from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `server/.env.test`
- `workers: 1` — tests run serially against the shared test DB

## Writing E2E Tests

Use the **`playwright-e2e-tester`** agent for all E2E test authoring. Trigger it after implementing a new feature or page, or when explicitly asked to write tests.

The agent knows the full test infrastructure setup, correct file paths, ports, credentials, and Playwright patterns for this codebase. Do not write test files directly — always delegate to that agent.

**Note:** `server/.env.test` is git-ignored. It must exist locally before running tests. See `.env.example` for the variable list; the test-specific values are port 3001, `helpdesk_test` DB URL, and test-only auth credentials.

## Environment Setup

The server reads from `server/.env` (its CWD at runtime). Copy `.env.example` there:

```bash
cp .env.example server/.env
```

Required variables:
- `PORT` — Express server port (default 3000)
- `CLIENT_URL` — Allowed CORS origin (default http://localhost:5173)
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:pass%40@localhost:5432/helpdesk`)
- `BETTER_AUTH_SECRET` — Long random string (32+ chars) for session signing
- `BETTER_AUTH_URL` — Server base URL (e.g. `http://localhost:3000`)
- `ANTHROPIC_API_KEY` — Claude API key
- `RESEND_API_KEY` — Resend email API key

**Note:** The `@` character in passwords must be URL-encoded as `%40` in the DATABASE_URL.

## Authentication

### Server (`server/src/lib/auth.ts`)

Better Auth is configured with:
- **Adapter:** `prismaAdapter` using the shared `prisma` singleton, provider `postgresql`
- **Email/password:** enabled, **sign-up is disabled** (`disableSignUp: true`) — accounts must be seeded
- **Custom field:** `role` (string, required, default `"agent"`) added via `user.additionalFields`
- **Trusted origins:** `BETTER_AUTH_URL` + `CLIENT_URL` from env

The auth handler is mounted in `server/src/index.ts` **before** `express.json()`:
```ts
app.all('/api/auth/*splat', toNodeHandler(auth))
```

### Client (`client/src/lib/auth-client.ts`)

```ts
import { createAuthClient } from 'better-auth/react'
export const authClient = createAuthClient()
// baseURL defaults to window.location.origin — works because Vite proxies /api to Express
```

Key methods used across the app:
- `authClient.signIn.email({ email, password })` — returns `{ error }` on failure
- `authClient.signOut()` — clears the session
- `authClient.useSession()` — React hook, returns `{ data: session, isPending }`

### Route protection (`client/src/App.tsx`)

`ProtectedRoute` wraps authenticated routes. It calls `authClient.useSession()` and:
- Shows a full-screen loading state while `isPending` is true
- Redirects to `/login` if `session` is null
- Renders children when a session exists

Current routes:
| Path | Component | Protected |
|------|-----------|-----------|
| `/login` | `LoginPage` | No |
| `/` | `HomePage` | Yes |
| `*` | Redirect → `/` | — |

### Login page (`client/src/pages/LoginPage.tsx`)

Built with shadcn/ui components (Card, Input, Label, Button) and react-hook-form + Zod:
- Schema validates email format and non-empty password
- Uses an inline Zod resolver (avoids Vite module-identity issues with `instanceof`)
- Sets `aria-invalid` on inputs to trigger shadcn's red-ring error state
- On success: navigates to `/`
- On auth error: sets a `root` form error displayed below the fields

### Seeding admin users

There is a seed script at `server/prisma/seed.ts` (or similar) that creates the initial admin account, since public sign-up is disabled. Run it after migrating:
```bash
$env:DATABASE_URL="..."; bun server/prisma/seed.ts
```

## shadcn/ui

- Style: `base-nova` | Base color: `neutral` | CSS variables: enabled
- Components live in `client/src/components/ui/`
- Add new components: `cd client && npx shadcn@latest add <component>`
- **Known issue:** the CLI places files in `client/@/components/ui/` (literal `@` dir) because the root `client/tsconfig.json` has no `paths`. After running `add`, move files from `client/@/components/ui/` → `client/src/components/ui/` and delete `client/@/`
- `@base-ui/react` is required by the `base-nova` Button and Input — it is already installed

## Key Conventions

- All API routes are prefixed `/api/`
- Server runs TypeScript natively via Bun — no compile step in development
- Tailwind v4 is configured via the `@tailwindcss/vite` plugin — no `tailwind.config.js`
- Better Auth handles sessions in PostgreSQL — `toNodeHandler(auth)` must be mounted **before** `express.json()` in Express
- Better Auth routes live at `/api/auth/*` — sign-up: `POST /api/auth/sign-up/email`, sign-in: `POST /api/auth/sign-in/email`, session: `GET /api/auth/get-session`
- Prisma v7 uses `prisma.config.ts` for the datasource URL — `url` is not in `schema.prisma`
- Prisma CLI must be run with `DATABASE_URL` in env: `$env:DATABASE_URL=...; .\node_modules\.bin\prisma migrate dev`
- Email threading uses `Message-ID` / `In-Reply-To` headers

## Using Context7 for Documentation

**Always use Context7 MCP to fetch up-to-date documentation** before implementing anything that involves a library or framework. Do not rely on training data for library APIs — use Context7 instead.

```
# Workflow
1. mcp__context7__resolve-library-id  →  find the library ID
2. mcp__context7__query-docs          →  fetch relevant docs
3. Implement based on the fetched docs
```

Key library IDs already resolved:
- Bun: `/oven-sh/bun`
- Express: `/websites/expressjs_en_5`
- Vite: `/vitejs/vite`
- Prisma: `/websites/prisma_io`
- Better Auth: `/websites/better-auth`
- shadcn/ui: `/websites/ui_shadcn`
- Anthropic SDK: resolve before use
- Resend: resolve before use

## Implementation Status

Phases are tracked in `implementation-plan.md`. Currently completed:

- [x] Phase 1 — Project setup (Bun workspace, Vite, Express, Tailwind, Docker removed)
- [x] Phase 2 (partial) — Prisma v7 installed, connected to local `helpdesk` PostgreSQL database, client singleton at `server/src/lib/db.ts`
- [x] Phase 3 (partial) — Better Auth installed, email/password + database sessions configured, migrated to PostgreSQL, routes at `/api/auth/*`
- [x] UI foundation — shadcn/ui installed (base-nova, neutral), login page built with Card/Input/Label/Button, ProtectedRoute guarding `/`
- [x] E2E testing infrastructure — Playwright configured at root, isolated `helpdesk_test` DB, globalSetup with migrate + seed, `test:e2e` / `test:e2e:ui` / `test:db:setup` scripts
