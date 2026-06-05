import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../src/lib/db.js'
import { AI_AGENT_EMAIL } from '../src/lib/constants.js'

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script must not run in production')
  process.exit(1)
}

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD
const agentEmail = process.env.SEED_AGENT_EMAIL
const agentPassword = process.env.SEED_AGENT_PASSWORD

if (!email || !password) {
  console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set')
  process.exit(1)
}

// Separate auth instance with sign-up enabled for seeding
const seedAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
})

/**
 * Upsert a user: delete any existing record (cascades to sessions/accounts)
 * then create a fresh one with the provided password and role. This ensures
 * the test credentials in .env.test always match what is in the DB, even if
 * the DB was seeded by a previous run with different credentials.
 */
async function upsertUser(
  userEmail: string,
  userPassword: string,
  name: string,
  role: 'admin' | 'agent',
) {
  const existing = await prisma.user.findUnique({ where: { email: userEmail } })

  if (existing) {
    // Cascade deletes sessions and accounts (see schema onDelete: Cascade)
    await prisma.user.delete({ where: { email: userEmail } })
  }

  await seedAuth.api.signUpEmail({
    body: { email: userEmail, password: userPassword, name },
  })

  await prisma.user.update({
    where: { email: userEmail },
    data: { role },
  })

  console.log(`${role} user seeded: ${userEmail}`)
}

async function seed(adminEmail: string, adminPassword: string) {
  await upsertUser(adminEmail, adminPassword, 'Admin', 'admin')

  // Seed agent user if credentials are provided
  if (agentEmail && agentPassword) {
    await upsertUser(agentEmail, agentPassword, 'Agent', 'agent')
  }

  // AI agent — system account used for auto-resolution assignment.
  // Uses create-if-not-exists (not upsert) to preserve the user ID across
  // seed runs so existing ticket FK references remain intact.
  const existingAi = await prisma.user.findUnique({ where: { email: AI_AGENT_EMAIL } })
  if (!existingAi) {
    await seedAuth.api.signUpEmail({
      body: { email: AI_AGENT_EMAIL, password: crypto.randomUUID(), name: 'AI' },
    })
    await prisma.user.update({
      where: { email: AI_AGENT_EMAIL },
      data: { role: 'agent' },
    })
    console.log(`AI agent seeded: ${AI_AGENT_EMAIL}`)
  } else {
    console.log(`AI agent already exists: ${AI_AGENT_EMAIL}`)
  }
}

seed(email, password)
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
