# AI-Powered Ticket Management System

## Problem

We receive hundreds of support emails daily. Our agents manually read, classify, and respond to each ticket — which is slow and leads to impersonal, canned responses.

## Solution

Build a ticket management system that uses AI to automatically classify, respond to, and route support tickets — delivering faster, more personalized responses to students while freeing up agents for complex issues.

## Features

- Receive support emails and create tickets; replies are threaded to existing tickets via `Message-ID` / `In-Reply-To` email headers
- Auto-generate human-friendly responses using a knowledge base _(delivery method — automatic vs. agent-approved — TBD)_
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets

## Ticket Statuses

Tickets progress through the following statuses:

- **Open** — newly created, awaiting action
- **Resolved** — a response has been sent or the issue addressed
- **Closed** — ticket is fully done, no further action needed

## Ticket Categories

Each ticket belongs to exactly one category:

- **General Questions** — miscellaneous or informational inquiries
- **Technical Questions** — issues related to systems, tools, or technical problems
- **Refund Requests** — requests for payment reversals or refunds

## User Roles

The system is deployed with a single **admin** account pre-configured. The admin can then create and manage **agent** accounts.

| Capability              | Admin | Agent |
|-------------------------|-------|-------|
| View & manage tickets   | ✓     | ✓     |
| Create/manage agents    | ✓     | ✗     |
