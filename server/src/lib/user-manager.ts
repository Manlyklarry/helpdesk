import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db.js'

const signUpAuth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  emailAndPassword: { enabled: true },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
})

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: 'admin' | 'agent' = 'agent',
) {
  await signUpAuth.api.signUpEmail({ body: { name, email, password } })
  return prisma.user.update({
    where: { email },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
}
