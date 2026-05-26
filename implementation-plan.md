# Implementation Plan

## Phase 1 — Project Setup & Infrastructure

> Goal: get a running skeleton with both apps talking to the database, all containerised.

- [ ] Initialise repo structure (`client/`, `server/`)
- [ ] Set up Express Server with TypeScript
- [ ] Set up React app with TypeScript
- [ ] set up PostgreSQL database


****


---

## Phase 2 — Database Schema & Authentication

> Goal: schema in place, admin can log in, routes are protected by role.

- [ ] Design and write Prisma schema:
  - `User` (id, name, email, passwordHash, role, createdAt)
  - `Ticket` (id, subject, body, status, category, createdAt, updatedAt)
  - `Session` (for connect-pg-simple)
- [ ] Run initial Prisma migration
- [ ] Seed script that creates the default admin account
- [ ] Install and configure `express-session` + `connect-pg-simple`
- [ ] `POST /api/auth/login` — validate credentials, create session
- [ ] `POST /api/auth/logout` — destroy session
- [ ] `GET /api/auth/me` — return current user from session
- [ ] Auth middleware: reject unauthenticated requests
- [ ] Role middleware: reject agents from admin-only routes
- [ ] Build login page in React (email + password form)
- [ ] Add auth context / hook in React to hold current user state
- [ ] Redirect unauthenticated users to login; redirect logged-in users away from login

---

## Phase 3 — User Management (Admin)

> Goal: admin can create and manage agent accounts through the UI.

- [ ] `GET /api/users` — list all users (admin only)
- [ ] `POST /api/users` — create a new agent account (admin only)
- [ ] `PATCH /api/users/:id` — update agent details (admin only)
- [ ] `DELETE /api/users/:id` — deactivate/remove an agent (admin only)
- [ ] User management page in React (table of agents)
- [ ] Create agent modal / form
- [ ] Confirm-before-delete dialog

---

## Phase 4 — Ticket Core (CRUD & UI)

> Goal: agents can view, filter, and manage tickets manually before any email or AI is wired up.

- [ ] Add ticket fields to Prisma schema: `senderName`, `senderEmail`, `subject`, `body`, `status`, `category`, `assignedTo`
- [ ] Run migration
- [ ] `GET /api/tickets` — list tickets with filtering (status, category) and sorting (date, status)
- [ ] `GET /api/tickets/:id` — single ticket detail
- [ ] `POST /api/tickets` — create ticket manually (for testing)
- [ ] `PATCH /api/tickets/:id/status` — update status (open → resolved → closed)
- [ ] `PATCH /api/tickets/:id/category` — update category
- [ ] Ticket list page: table with columns (subject, sender, category, status, date)
- [ ] Filter bar: filter by status and category
- [ ] Sort controls: by date and status
- [ ] Ticket detail page: full email body, metadata, status/category controls
- [ ] Status badge component (colour-coded: open, resolved, closed)
- [ ] Category badge component

---

## Phase 5 — Email Integration

> Goal: real emails create tickets; replies are sent back to the sender.

- [ ] Create a Resend account and configure an inbound email address
- [ ] `POST /api/webhooks/email` — inbound webhook endpoint
- [ ] Parse inbound Resend payload → create a `Ticket` record
- [ ] Store `Message-ID` header from each inbound email on the `Ticket` record
- [ ] Handle email threading: if the inbound email's `In-Reply-To` header matches a stored `Message-ID`, append to that ticket instead of creating a new one
- [ ] `POST /api/tickets/:id/reply` — send an outbound reply via Resend and mark ticket as Resolved
- [ ] Reply form on ticket detail page
- [ ] Store outbound replies in the database (`Reply` model: ticketId, body, sentAt, sentBy)
- [ ] Display reply thread on ticket detail page

---

## Phase 6 — AI Features

> Goal: the system classifies tickets automatically and assists agents with summaries and suggested replies.

**Knowledge Base**
- [ ] Create `KnowledgeBaseEntry` model (id, title, body, createdAt)
- [ ] Seed the knowledge base with initial FAQs / policy documents
- [ ] `GET /api/knowledge-base` and `POST /api/knowledge-base` (admin only)

**Classification**
- [ ] On ticket creation, call Claude API to classify the ticket into one of the three categories
- [ ] Save the AI-assigned category to the ticket (agents can override)

**Summarisation**
- [ ] `GET /api/tickets/:id/summary` — call Claude API to summarise the ticket body
- [ ] Display AI summary on ticket detail page (collapsible)

**Suggested Replies**
- [ ] `GET /api/tickets/:id/suggested-reply` — call Claude API with ticket body + relevant knowledge base entries
- [ ] Display suggested reply in the reply form as pre-filled text (editable before sending)

**Auto-Response** _(decision pending — revisit before starting Phase 6)_
- [ ] Decide: AI sends reply automatically vs. AI only pre-fills the reply form for agent review
- [ ] Implement based on decision above

---

## Phase 7 — Dashboard

> Goal: agents and admins get an at-a-glance view of the system's health.

- [ ] `GET /api/dashboard/stats` — return counts: open, resolved, closed, total
- [ ] Dashboard page with stat cards (total tickets, open, resolved, closed)
- [ ] Recent tickets list on dashboard (latest 10)
- [ ] Breakdown by category (simple count per category)

---

## Phase 8 — Production Deployment

> Goal: the system runs reliably in a production Docker environment.

- [ ] Write production `Dockerfile` for `client/` (Nginx serving Vite build output)
- [ ] Write production `Dockerfile` for `server/` (compiled JS, no dev dependencies)
- [ ] Add Nginx config to reverse-proxy API requests from `client` container to `server`
- [ ] Add `docker-compose.prod.yml` with production overrides (no volume mounts, restart policies)
- [ ] Configure production environment variables (secrets, database URL, Resend API key, Claude API key)
- [ ] Run database migrations on container startup (`prisma migrate deploy`)
- [ ] Run seed script for admin account on first deploy
- [ ] Smoke test all critical paths in the production build

---

## Dependency Order

```
Phase 1 → Phase 2 → Phase 3
                  → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8
```

Phases 3 and 4 can be worked on in parallel once Phase 2 is complete.
Phase 6 requires Phase 4 (tickets exist) and can begin in parallel with Phase 5.
