---
name: finding-seed-signup-bypass
description: seed.ts instantiates a second betterAuth with disableSignUp omitted (sign-up enabled); must be blocked from production use
metadata:
  type: project
---

server/prisma/seed.ts creates `seedAuth` with `emailAndPassword: { enabled: true }` and no `disableSignUp: true`. This instance is used only for the seeding path but creates a second live auth instance with sign-up enabled.

**Why:** If seed.ts is ever executed in a production environment (CI/CD pipeline, post-deploy hook), it enables sign-up on a separate auth instance. The risk is low because the seed instance has no HTTP server, but it is a policy violation.

**How to apply:** Recommend adding a NODE_ENV check to prevent seed execution in production. Also recommend using prisma.$executeRaw or direct Prisma user creation + password hash rather than a second auth instance.
