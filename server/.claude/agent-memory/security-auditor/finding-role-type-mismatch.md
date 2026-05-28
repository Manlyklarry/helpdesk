---
name: finding-role-type-mismatch
description: Better Auth additionalFields defines role as type:'string' but Prisma schema uses enum Role; no server-side requireAdmin middleware exists
metadata:
  type: project
---

- auth.ts: role is `type: 'string'` with no allowedValues constraint
- schema.prisma: role is `Role` enum (admin | agent)
- No requireAdmin middleware exists in server/src/middleware/

**Why:** The string type in Better Auth means any string value could theoretically be written to the role field if Better Auth's update-user endpoint is ever exposed without constraints. Prisma will reject non-enum values at DB level, but the lack of a server-side admin gate for API routes is a forward risk.

**How to apply:** When new admin-only API routes are added, flag absence of requireAdmin middleware. Recommend adding role enum constraint to Better Auth field definition.
