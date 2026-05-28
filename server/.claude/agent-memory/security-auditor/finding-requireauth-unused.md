---
name: finding-requireauth-unused
description: requireAuth middleware exists at server/src/middleware/requireAuth.ts but is not applied to any routes in server/src/routes/index.ts
metadata:
  type: project
---

requireAuth is correctly implemented (calls auth.api.getSession, attaches user to req, returns 401 on failure) but is not imported or used in routes/index.ts. Currently only /api/health exists, which is intentionally public.

**Why:** As new routes are added, there is a pattern risk of forgetting to apply the middleware. The guard exists but isn't enforced architecturally.

**How to apply:** When reviewing new routes, always check requireAuth is applied. Suggest making the router apply requireAuth at the top level (all routes) with opt-out for public ones, rather than opt-in per route.
