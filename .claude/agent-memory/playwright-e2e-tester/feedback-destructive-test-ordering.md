---
name: feedback-destructive-test-ordering
description: Destructive tests (Delete) must be ordered last in a file when earlier tests depend on the same seeded data
metadata:
  type: feedback
---

In `users.spec.ts`, the Delete test removes the seeded agent from the DB. Any test that signs in as the seeded agent (e.g. "Agent access control") must run BEFORE the Delete test, or it will fail because the agent no longer exists.

**Why:** `workers: 1` runs tests in file order. Playwright does not re-seed between tests within a run — `globalSetup` only seeds once before the entire run. If Delete runs first, the seeded agent row is gone for the rest of the run.

**How to apply:** In any spec file that mixes read-only tests with destructive ones:
1. Order test groups so non-destructive tests (Read, access-control) come first.
2. Place destructive tests (Delete, bulk-delete, hard-delete) at the end.
3. Add a comment on the destructive describe block explaining it is intentionally last.
4. The Create test is safe to place anywhere because it uses a unique timestamp email and doesn't touch seeded data.

See [[project-auth-patterns]] for how the globalSetup seeds agent/admin.
