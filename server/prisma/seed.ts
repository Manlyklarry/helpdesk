import 'dotenv/config'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from '../src/lib/db.js'

if (process.env.NODE_ENV === 'production') {
  console.error('Seed script must not run in production')
  process.exit(1)
}

const email = process.env.SEED_ADMIN_EMAIL
const password = process.env.SEED_ADMIN_PASSWORD

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

async function seed(adminEmail: string, adminPassword: string) {
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })

  if (!existing) {
    await seedAuth.api.signUpEmail({
      body: { email: adminEmail, password: adminPassword, name: 'Admin' },
    })
    console.log(`Admin user created: ${adminEmail}`)
  }

  await prisma.user.update({
    where: { email: adminEmail },
    data: { role: 'admin' },
  })

  console.log(`Role set to admin for: ${adminEmail}`)
}

seed(email, password)
  .catch((err) => { console.error(err); process.exit(1) })
  .finally(() => prisma.$disconnect())
