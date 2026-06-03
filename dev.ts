import { spawn } from 'bun'
import { watch } from 'fs'

function spawnServer() {
  return spawn(['bun', 'run', 'dev'], {
    cwd: './server',
    stdout: 'inherit',
    stderr: 'inherit',
  })
}

let server = spawnServer()

const client = spawn(['bun', 'run', 'dev'], {
  cwd: './client',
  stdout: 'inherit',
  stderr: 'inherit',
})

// When the Prisma schema changes (e.g. after a migration), restart the server
// so that the `prisma generate` step at startup picks up the updated client types.
let debounce: ReturnType<typeof setTimeout> | null = null
watch('./server/prisma', { recursive: true }, (_event, filename) => {
  if (typeof filename !== 'string' || !filename.endsWith('.prisma')) return
  if (debounce) clearTimeout(debounce)
  debounce = setTimeout(() => {
    console.log('\n[dev] Prisma schema changed — restarting server...')
    server.kill()
    server = spawnServer()
  }, 300)
})

process.on('SIGINT', () => {
  server.kill()
  client.kill()
  process.exit(0)
})

// Keep the dev process alive as long as the client (Vite) is running.
// The server is managed independently so schema-change restarts don't exit dev.ts.
await client.exited
server.kill()
