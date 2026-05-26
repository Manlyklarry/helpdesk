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
| Auth       | express-session + connect-pg-simple (database sessions) |
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
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css       # @import 'tailwindcss'
│   └── vite.config.ts      # Tailwind plugin + /api proxy → localhost:3000
└── server/                 # Express backend
    ├── .env                # Server environment variables (git-ignored)
    ├── prisma/
    │   └── schema.prisma   # Prisma schema and data models
    ├── src/
    │   ├── index.ts        # App entry: cors, json, router
    │   ├── lib/
    │   │   └── prisma.ts   # Prisma client singleton
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

## Environment Setup

The server reads from `server/.env` (its CWD at runtime). Copy `.env.example` there:

```bash
cp .env.example server/.env
```

Required variables:
- `PORT` — Express server port (default 3000)
- `CLIENT_URL` — Allowed CORS origin (default http://localhost:5173)
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://postgres:pass%40@localhost:5432/helpdesk`)
- `SESSION_SECRET` — Long random string for session signing
- `ANTHROPIC_API_KEY` — Claude API key
- `RESEND_API_KEY` — Resend email API key

**Note:** The `@` character in passwords must be URL-encoded as `%40` in the DATABASE_URL.

## Key Conventions

- All API routes are prefixed `/api/`
- Server runs TypeScript natively via Bun — no compile step in development
- Tailwind v4 is configured via the `@tailwindcss/vite` plugin — no `tailwind.config.js`
- Database sessions stored in PostgreSQL via `connect-pg-simple`
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
- shadcn/ui: resolve before use
- Anthropic SDK: resolve before use
- Resend: resolve before use

## Implementation Status

Phases are tracked in `implementation-plan.md`. Currently completed:

- [x] Phase 1 — Project setup (Bun workspace, Vite, Express, Tailwind, Docker removed)
- [x] Phase 2 (partial) — Prisma installed, connected to local `helpdesk` PostgreSQL database, client singleton created (`server/src/lib/prisma.ts`)
