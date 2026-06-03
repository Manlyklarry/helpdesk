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
| HTTP client | Axios (client-side API calls)  |
| Server state | TanStack Query v5 (useQuery, useMutation) |
| AI         | Anthropic Claude API            |
| Email      | Resend (inbound webhook + outbound) |
| Validation | Zod (client forms via react-hook-form resolver + server request bodies) |

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
│   │   │   ├── api.ts          # axiosError(err, fallback) — shared error extractor
│   │   │   ├── form.ts         # makeZodResolver(schema) — shared RHF/Zod resolver factory
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

## Dev Server Auto-Refresh

`bun run dev` starts both servers concurrently via `dev.ts`:

| Layer | Mechanism | Behaviour |
|-------|-----------|-----------|
| Client (Vite) | HMR | Browser updates instantly on save — no page reload for most changes |
| Server (bun --watch) | File watcher | Full process restart on any change under `server/src/` |
| Prisma schema | `dev.ts` fs.watch | `dev.ts` watches `server/prisma/*.prisma`; when the file changes (e.g. after a migration), it kills and restarts the server so `prisma generate` re-runs automatically |

After running `prisma migrate dev`, the server restarts on its own — no manual restart needed.

## Cross-layer Consistency

When a change spans more than one layer, always propagate it completely before stopping work:

| Change | What else must be updated |
|--------|--------------------------|
| Prisma schema field added / renamed / removed | Migration SQL → `prisma generate` → server route(s) that read/write that field → `client/src/types/` → any page/component that uses the type → test fixtures |
| New or changed API route / response shape | `client/src/types/` → page `useQuery` / `useMutation` → test mocks |
| Client type changed | All pages and components that reference it → test mocks |
| New shared utility | Replace every inline use of the pattern with the utility → add to the utilities table in CLAUDE.md |

Never leave a layer out of sync — e.g. do not add a schema field without updating the corresponding TypeScript type, or add a server route without updating the client query.

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

**Rule: write an E2E test only when the assertion requires a real running server or real database state. If it can be tested by mocking `axios`, it belongs in a component test.**

Ask before writing any E2E test: _does this test pass or fail based on what the real server/DB does?_ If no — it's a component test.

**Always write E2E for:**
- Protected-route redirects (real Better Auth session required to verify)
- Server-side rejection of bad credentials (Better Auth returns the error, not the client)
- DB-backed mutations (create, edit, delete) and their effect on the table
- Webhook API contracts (status codes, response shape, DB side-effects)
- Full session lifecycle: login → action → logout → redirect
- Email threading, message persistence, reply flows

**Never write E2E for:**
- Page headings, column headers, any static text
- Badge colours, date formatting, number formatting
- Loading skeletons, empty states, error message text
- Zod / client-side validation errors and aria-invalid attributes
- Button disabled/loading states
- Navbar rendering or role-based link visibility
- Any assertion that can be satisfied with a mocked axios response

Use the **`playwright-e2e-tester`** agent when an E2E test is genuinely warranted. The agent knows the full test infrastructure setup, correct file paths, ports, credentials, and Playwright patterns for this codebase. Do not write E2E test files directly — always delegate to that agent.

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
| `/tickets` | `TicketsPage` | Yes |
| `/users` | `UsersPage` | Yes (admin only) |
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

## Data Fetching

All client-side API calls use **Axios** + **TanStack Query v5**. Never use `fetch` directly in components.

- Use `axios.get<T>`, `axios.post<T>`, etc. with `{ withCredentials: true }` on every request so the session cookie is sent
- Wrap every server-state read in `useQuery({ queryKey: [...], queryFn })` — never use `useEffect` + `useState` for data fetching
- Use `useMutation` for writes (POST / PATCH / DELETE); call `queryClient.invalidateQueries` in `onSuccess` to keep the cache fresh
- The `QueryClientProvider` is mounted in `client/src/main.tsx` — do not add additional providers
- Extract axios error messages with the shared helper: `import { axiosError } from '@/lib/api'` → `axiosError(err, 'fallback message')`. Never inline the 3-line extraction pattern.

## Shared Utilities

### Client

| Export | File | Purpose |
|--------|------|---------|
| `axiosError(err, fallback)` | `client/src/lib/api.ts` | Extract a human-readable message from an Axios error; falls back to the second argument |
| `makeZodResolver(schema)` | `client/src/lib/form.ts` | Wrap a Zod schema as a react-hook-form `Resolver`; avoids Vite `instanceof` issues |
| `cn(...classes)` | `client/src/lib/utils.ts` | Merge Tailwind class names (clsx + tailwind-merge) |
| `StatusBadge` | `client/src/components/ticket-badges.tsx` | Badge component for ticket status (open/resolved/closed) |
| `CategoryBadge` | `client/src/components/ticket-badges.tsx` | Badge component for ticket category (general/technical/refund); caller handles the `null` case |
| `useTicketPatch<T>(mutationFn, invalidate, fallback)` | `client/src/hooks/useTicketPatch.ts` | Mutation hook for sidebar ticket field updates — manages error state, clears on success, invalidates the supplied query keys |
| `usePolishReply(ticketId, onPolished)` | `client/src/hooks/usePolishReply.ts` | Mutation hook for the Polish button — calls `POST /api/tickets/:id/polish-reply`, invokes `onPolished(text)` on success, manages its own error state; returns `{ polish(body), isPolishing, error }` |
| `useSummarize(ticketId)` | `client/src/hooks/useSummarize.ts` | Mutation hook for the Summarize button — calls `POST /api/tickets/:id/summarize`, stores result in local state, manages its own error state; returns `{ summarize(), isSummarizing, summary, error }` |

**Rules:**
- Always use `axiosError` to extract error messages — never inline the 3-line Axios error extraction pattern
- Always use `makeZodResolver` for react-hook-form schemas — never inline the resolver function
- Import `StatusBadge` / `CategoryBadge` from `ticket-badges.tsx` — never redefine them locally in a page
- Use `useTicketPatch` for any sidebar PATCH mutation — never duplicate the `useState(error)` + `useMutation` + `invalidateQueries` pattern
- Use `usePolishReply` for the polish reply action — never inline the polish mutation in a component
- Use `useSummarize` for the summarize action — never inline the summarize mutation in a component

### Server

| Export | File | Purpose |
|--------|------|---------|
| `parseIntParam(value)` | `server/src/lib/http.ts` | Parse a route param to `number`, returns `null` on failure; use in every `/:id` handler |
| `firstZodError(err, fallback?)` | `server/src/lib/zod.ts` | Return the first Zod issue message; use after every `schema.safeParse` failure |
| `findTicketOr404(id, res)` | local helper in `server/src/routes/tickets.ts` | Looks up a ticket by ID; writes a 404 response and returns `false` if not found — use in every handler that needs to guard on ticket existence |

**Rules:**
- Always use `parseIntParam` for integer route params — never inline `parseInt` + `isNaN`
- Always use `firstZodError` for Zod validation errors — never inline `err.issues[0]?.message`
- Always use `findTicketOr404` before operating on a ticket — never inline the `findUnique + if (!existing) 404` pattern

## Loading States

Always use the `Skeleton` component (`client/src/components/ui/skeleton.tsx`) for loading states — never use spinner text like "Loading…".

- Mirror the real layout: render a skeleton table during a table load, skeleton cards during a card load, etc. so there is no layout shift when data arrives
- Size skeleton elements to approximate the real content (`h-4 w-28` for a name, `h-4 w-44` for an email, `rounded-full` for a badge pill)
- Use `isLoading` from `useQuery` to gate the skeleton; show the real content once `isLoading` is false
- **Note:** the shadcn CLI does not support the `base-nova` style — write new UI primitives manually following the pattern in `skeleton.tsx` (import `cn` from `@/lib/utils`, export a single named function component)

## Testing Strategy

**Default to component tests. Write E2E only when the assertion requires a real running server or real database state — not just because a feature "touches" the server.**

| Scenario | Test type |
|----------|-----------|
| Page renders data correctly (table rows, badges, dates) | Component |
| Loading skeleton, empty state, error state | Component |
| Form validation (Zod errors, aria-invalid, disabled states) | Component |
| Modal open/close, button states, role-based UI differences | Component |
| Navbar rendering, static text, badge colours | Component |
| Protected-route redirects (real session required) | E2E |
| Auth: valid credentials, wrong password, non-existent email | E2E |
| Full session lifecycle (login → action → logout → redirect) | E2E |
| DB-backed mutations and their visible effect (create, edit, delete) | E2E |
| Webhook API contracts (status codes, response shape, DB side-effects) | E2E |
| Server-side business logic (e.g. email threading, message persistence) | E2E |

**Decision rule:** if a test can be written by mocking `axios` in a component test, it is a component test — regardless of whether it involves auth, navigation, or server data. Reach for E2E only when the assertion genuinely requires a real server response or database record to be meaningful.

## Component & Unit Tests

### Stack
- **Runner:** Vitest v4 (configured in `client/vite.config.ts` — `globals: true`, `environment: jsdom`)
- **Rendering:** `@testing-library/react`
- **Matchers:** `@testing-library/jest-dom` (extended in `client/src/test/setup.ts`)
- **Test files:** co-located with the component, e.g. `src/pages/TicketsPage.test.tsx`

### Running tests
```bash
bun run test          # run once (from repo root or client/)
bun run test:watch    # watch mode
```

### Writing tests

**Wrap every render** in `MemoryRouter` (for `Link`/`useNavigate`) and a fresh `QueryClient`:
```tsx
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ComponentUnderTest />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}
```

**Mock `../lib/auth-client`** whenever the component tree includes `Navbar` (which calls `authClient.useSession()`):
```ts
vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({
      data: { user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' } },
      isPending: false,
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}))
```

**Mock axios calls** with `vi.spyOn` — never hit the real network:
```ts
beforeEach(() => {
  vi.spyOn(axios, 'get').mockResolvedValue({ data: mockData })
})
afterEach(() => { vi.restoreAllMocks() })
```

**Test the loading skeleton** by making the promise never resolve:
```ts
vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
```

**Simulate axios error with a server message** using the `isAxiosError` property:
```ts
const err = Object.assign(new Error('Forbidden'), {
  isAxiosError: true,
  response: { data: { error: 'Forbidden' } },
})
vi.spyOn(axios, 'get').mockRejectedValue(err)
```

**What to cover per page/component:**
- Loading skeleton is shown; real data is absent
- Data renders correctly (names, emails, dates, badges)
- Empty state
- Error state (generic + server message)
- Any role/permission-dependent UI differences

## Key Conventions

- **Cross-layer changes must be fully propagated** — see the Cross-layer Consistency table above. Never leave schema, routes, types, UI, and tests out of sync.
- All API routes are prefixed `/api/`
- Server runs TypeScript natively via Bun — no compile step in development
- Tailwind v4 is configured via the `@tailwindcss/vite` plugin — no `tailwind.config.js`
- Better Auth handles sessions in PostgreSQL — `toNodeHandler(auth)` must be mounted **before** `express.json()` in Express
- Better Auth routes live at `/api/auth/*` — sign-up: `POST /api/auth/sign-up/email`, sign-in: `POST /api/auth/sign-in/email`, session: `GET /api/auth/get-session`
- Prisma v7 uses `prisma.config.ts` for the datasource URL — `url` is not in `schema.prisma`
- Prisma CLI must be run with `DATABASE_URL` in env: `$env:DATABASE_URL=...; .\node_modules\.bin\prisma migrate dev`
- Email threading uses `Message-ID` / `In-Reply-To` headers
- **Validation with Zod:** use Zod for all request body validation on the server (`zod` is in `server/package.json`). Define a schema per route, call `schema.safeParse(req.body)`, and return `res.status(400).json({ error: issues[0].message })` on failure. On the client, pass schemas through the shared resolver factory: `import { makeZodResolver } from '@/lib/form'` → `resolver: makeZodResolver(schema)`. Never inline the resolver function.

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
