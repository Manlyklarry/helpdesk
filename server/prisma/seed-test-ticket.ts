import 'dotenv/config'
import { prisma } from '../src/lib/db.js'

const ticket = await prisma.ticket.create({
  data: {
    subject: 'Test ticket — login page not loading',
    status: 'open',
    category: 'technical',
    fromEmail: 'alice@example.com',
    fromName: 'Alice Johnson',
    messages: {
      create: {
        messageId: '<test-msg-001@example.com>',
        direction: 'inbound',
        fromEmail: 'alice@example.com',
        fromName: 'Alice Johnson',
        body: 'Hi, the login page has been showing a blank screen since this morning. Can you help?',
      },
    },
  },
  include: { messages: true },
})

console.log('Created ticket:', JSON.stringify(ticket, null, 2))
await prisma.$disconnect()
process.exit(0)
