# Tech Stack

## Frontend
- **React** — UI library for building the dashboard
- **TypeScript** — type safety across all frontend code
- **Vite** — fast dev server and build tool for React
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — pre-built accessible UI components (tables, modals, badges, etc.)

## Backend
- **Node.js** — runtime environment
- **Express** — HTTP server and API routing
- **TypeScript** — type safety across all backend code

## Database
- **PostgreSQL** — relational database for tickets, users, sessions, and categories
- **Prisma** — type-safe ORM for database access and schema management

## Authentication
- **express-session** — session middleware for Express
- **connect-pg-simple** — stores sessions in PostgreSQL (no separate session store needed)
- Role-based access enforced server-side (admin vs agent)

## AI
- **Anthropic Claude API** — powers ticket classification, summaries, and suggested replies

## Email
- **Resend** — inbound email parsing (webhook) to create tickets, and outbound sending for replies

## Deployment
- **Docker** — containerised application
- **Docker Compose** — orchestrates frontend, backend, and PostgreSQL containers together

## Project Structure
```
helpdesk/
├── client/          # React + TypeScript frontend
├── server/          # Express + TypeScript backend
├── docker-compose.yml
└── ...
```
