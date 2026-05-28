---
name: finding-cors-localhost-wildcard
description: CORS origin check in server/src/index.ts allows any http://localhost:* origin, not just the configured CLIENT_URL
metadata:
  type: project
---

server/src/index.ts CORS handler:
```ts
if (!origin || origin === allowed || origin.startsWith('http://localhost:')) {
```

The `origin.startsWith('http://localhost:')` branch bypasses the CLIENT_URL restriction for all localhost ports.

**Why:** An attacker or malicious local process on port other than 5173 can make credentialed cross-origin requests to the API during development. Less severe in production if CLIENT_URL is set correctly but the wildcard remains active.

**How to apply:** Flag wildcard localhost CORS as a medium risk. Suggest removing the startsWith branch or restricting it to a specific dev port set.
