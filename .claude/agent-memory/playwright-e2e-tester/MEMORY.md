# Playwright E2E Tester — Memory Index

- [Test Infrastructure](project-test-infrastructure.md) — config layout, webServer commands, auth state file path, env loading pattern
- [Auth Test Patterns](project-auth-patterns.md) — seeded admin+agent credentials, storageState usage, per-describe vs per-test opt-in
- [Page Selectors](project-page-selectors.md) — confirmed locators for LoginPage, Navbar, HomePage, UsersPage, TicketsPage, and webhook patterns
- [Aria-Invalid Behaviour](project-aria-invalid.md) — how shadcn Input exposes aria-invalid and when it resets
- [Server Reuse Gotcha](feedback-server-reuse-gotcha.md) — reuseExistingServer causes "Invalid email or password" when dev server is on test port
- [Destructive Test Ordering](feedback-destructive-test-ordering.md) — Delete tests must run last; access-control tests using seeded data must precede them
