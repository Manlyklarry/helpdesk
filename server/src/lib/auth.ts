import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db.js'

const secret = process.env.BETTER_AUTH_SECRET
if (!secret || secret.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must be set to a random string of at least 32 characters')
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      role: {
        type: ['admin', 'agent'] as const,
        required: true,
        defaultValue: 'agent',
        input: false,
      },
    },
  },
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret,
  trustedOrigins: [process.env.BETTER_AUTH_URL, process.env.CLIENT_URL].filter((v): v is string => Boolean(v)),
})
