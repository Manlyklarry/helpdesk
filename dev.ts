import { spawn } from 'bun'
import { watch } from 'fs'

let stopping = false

function spawnServer() {
  const proc = spawn(['bun', 'run', 'dev'], {
    cwd: './server',
    stdout: 'inherit',
    stderr: 'inherit',
  })

  // Auto-restart on unexpected exit (crash). bun --watch exits 0 on normal
  // file-change restarts, so only restart on non-zero exit codes.
  proc.exited.then((code) => {
    if (stopping) return
    if (code !== 0) {
      console.log(`\n[dev] Server exited with code ${code} — restarting in 1s...`)
      setTimeout(() => { server = spawnServer() }, 1_000)
    }
  })

  return proc
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
  stopping = true
  server.kill()
  client.kill()
  process.exit(0)
})

// Keep the dev process alive as long as the client (Vite) is running.
// The server is managed independently so schema-change restarts don't exit dev.ts.
await client.exited
stopping = true
server.kill()
