# Security Auditor Memory Index

- [Hardcoded Credentials in .env](finding-hardcoded-env-credentials.md) — BETTER_AUTH_SECRET and SEED_ADMIN_PASSWORD are weak/default values in server/.env
- [CORS Localhost Wildcard](finding-cors-localhost-wildcard.md) — origin check allows all http://localhost:* origins, widens attack surface in dev
- [Auth Schema Role Type Mismatch](finding-role-type-mismatch.md) — Better Auth role field is type:string but Prisma schema uses enum Role; no server-side admin guard middleware yet
- [Seed Auth Instance Sign-Up Bypass](finding-seed-signup-bypass.md) — seed.ts creates a second betterAuth instance with sign-up enabled; must never run in production env
- [Auth Client Type Import Risk](finding-auth-client-type-import.md) — auth-client.ts imports server type via relative path; safe today but risks bundling server code if import drifts
- [BETTER_AUTH_SECRET Undefined Risk](finding-auth-secret-undefined.md) — secret passed as process.env.BETTER_AUTH_SECRET which can be undefined; Better Auth may fall back to insecure default
- [requireAuth Middleware Exists but Unused](finding-requireauth-unused.md) — requireAuth middleware correctly written but not yet wired to any routes; critical gap as more routes are added
