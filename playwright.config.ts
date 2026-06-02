import { defineConfig, devices } from '@playwright/test'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// ---------------------------------------------------------------------------
// Load test credentials from server/.env.test so that test files can read
// them via process.env.SEED_ADMIN_EMAIL / process.env.SEED_ADMIN_PASSWORD
// ---------------------------------------------------------------------------
function loadEnvFile(filePath: string): Record<string, string> {
  try {
    const vars: Record<string, string> = {}
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, '')
      vars[key] = val
    }
    return vars
  } catch {
    return {}
  }
}

const testEnv = loadEnvFile(resolve(__dirname, 'server/.env.test'))
for (const [key, value] of Object.entries(testEnv)) {
  if (!(key in process.env)) {
    process.env[key] = value
  }
}

// ---------------------------------------------------------------------------
// Playwright config
// ---------------------------------------------------------------------------

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    // ------------------------------------------------------------------
    // 1. Auth setup — runs first, saves session to playwright/.auth/
    // ------------------------------------------------------------------
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // ------------------------------------------------------------------
    // 2. Login tests — no saved session (tests auth from a clean state)
    // ------------------------------------------------------------------
    {
      name: 'login',
      testMatch: /login\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ------------------------------------------------------------------
    // 3. Protected-route tests — mix of authenticated + unauthenticated
    //    tests; each test opts-in to storageState individually.
    // ------------------------------------------------------------------
    {
      name: 'protected-routes',
      testMatch: /protected-route\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ------------------------------------------------------------------
    // 4. Logout tests — start from saved admin session
    // ------------------------------------------------------------------
    {
      name: 'logout',
      testMatch: /logout\.spec\.ts/,
      dependencies: ['setup'],
    },

    // ------------------------------------------------------------------
    // 5. General chromium project — picks up any spec not matched above
    // ------------------------------------------------------------------
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: [
        /auth\.setup\.ts/,
        /login\.spec\.ts/,
        /protected-route\.spec\.ts/,
        /logout\.spec\.ts/,
      ],
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'bun --cwd=server run start:test',
      url: `${testEnv.API_BASE_URL ?? 'http://127.0.0.1:3001'}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
    {
      command: 'bun --cwd=client run dev',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        VITE_PORT: '5174',
        VITE_API_PORT: '3001',
      },
    },
  ],
  globalSetup: './e2e/global-setup.ts',
})
