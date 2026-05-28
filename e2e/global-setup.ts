import { execSync } from 'child_process'
import { resolve } from 'path'
import { readFileSync } from 'fs'

const serverDir = resolve(__dirname, '../server')

function parseEnvFile(filePath: string): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    vars[key] = val
  }
  return vars
}

export default async function globalSetup() {
  const testEnv = parseEnvFile(resolve(serverDir, '.env.test'))
  const env = { ...process.env, ...testEnv }

  execSync('bun run migrate:deploy', {
    cwd: serverDir,
    stdio: 'inherit',
    env,
  })

  execSync('bun run seed', {
    cwd: serverDir,
    stdio: 'inherit',
    env: { ...env, NODE_ENV: 'development' },
  })
}
