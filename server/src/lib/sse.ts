import type { Response } from 'express'

const clients = new Set<Response>()

export function addSseClient(res: Response): () => void {
  clients.add(res)
  return () => clients.delete(res)
}

export function broadcastSse(event: string, data: unknown): void {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}
