import { spawn } from 'bun'

const server = spawn(['bun', 'run', 'dev'], {
  cwd: './server',
  stdout: 'inherit',
  stderr: 'inherit',
})

const client = spawn(['bun', 'run', 'dev'], {
  cwd: './client',
  stdout: 'inherit',
  stderr: 'inherit',
})

process.on('SIGINT', () => {
  server.kill()
  client.kill()
  process.exit(0)
})

await Promise.all([server.exited, client.exited])
