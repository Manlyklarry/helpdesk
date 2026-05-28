---
name: finding-hardcoded-env-credentials
description: server/.env contains weak BETTER_AUTH_SECRET and seeded admin password that must be rotated before any deployment
metadata:
  type: project
---

server/.env (not committed, correctly git-ignored) contains:
- BETTER_AUTH_SECRET=super-secret-key-change-this-in-production-min-32-chars — weak placeholder
- SEED_ADMIN_PASSWORD=password12 — trivially guessable
- SEED_ADMIN_EMAIL=admin@example.com — predictable

**Why:** Weak auth secret allows session token forgery if server is ever exposed. Weak admin password is the only vector into a system with sign-up disabled.

**How to apply:** Flag any time credentials/secrets appear in .env files or environment config. Always verify BETTER_AUTH_SECRET is cryptographically random (32+ bytes, base64/hex).
