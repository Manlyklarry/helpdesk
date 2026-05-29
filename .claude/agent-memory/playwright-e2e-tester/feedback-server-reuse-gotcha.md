---
name: feedback-server-reuse-gotcha
description: reuseExistingServer causes test failures when a dev server (wrong DB) is already running on the test port
metadata:
  type: feedback
---

When `bun run test:e2e` fails with "Invalid email or password" despite the seed succeeding, the root cause is almost always a stale dev server reuse.

**Why:** Playwright config has `reuseExistingServer: !process.env.CI`. If `bun run dev` (or a manual `bun --cwd server run start`) has already started servers on ports 5174 and/or 3001, Playwright reuses them instead of starting fresh ones with the test env vars. The dev Vite server proxies `/api` to port 3000 (dev `helpdesk` DB) instead of port 3001 (`helpdesk_test` DB), so seeded test credentials don't match.

**How to apply:** Before running `bun run test:e2e` during development, ensure no dev servers are running on 5174 or 3001. If tests fail with "Invalid email or password" and the seed output looks correct, kill the processes on those ports and rerun. Use PowerShell: `Get-NetTCPConnection -LocalPort 5174, 3001 -State Listen | ...` to find PIDs, then `Stop-Process -Id <PID> -Force`.

See also: [[project-test-infrastructure]]
