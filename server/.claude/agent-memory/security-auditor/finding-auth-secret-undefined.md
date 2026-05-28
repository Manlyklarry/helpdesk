---
name: finding-auth-secret-undefined
description: Better Auth secret is passed as process.env.BETTER_AUTH_SECRET which TypeScript allows to be undefined; no startup validation
metadata:
  type: project
---

server/src/lib/auth.ts:
```ts
secret: process.env.BETTER_AUTH_SECRET,
```

TypeScript types this as `string | undefined`. Better Auth's behavior when secret is undefined is library-defined and may silently use a weak default or throw at runtime only on first session operation.

**Why:** If .env is missing or the key is unset, sessions could be signed with an insecure fallback key without any startup error.

**How to apply:** Recommend adding a startup guard that throws immediately if BETTER_AUTH_SECRET is missing or too short (< 32 chars).
