import { Router } from 'express'
import { addSseClient } from '../lib/sse.js'

const router = Router()

router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Keep-alive heartbeat every 30s to prevent proxy/load-balancer timeouts
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 30_000)

  const remove = addSseClient(res)

  req.on('close', () => {
    clearInterval(heartbeat)
    remove()
  })
})

export default router
