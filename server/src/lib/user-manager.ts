import type { Role } from '@prisma/client'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from './db.js'

export type UpdateUserData = {
  name: string
  email: string
  role: Role
  password?: string
}

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
  role: Role = 'agent',
) {
  await signUpAuth.api.signUpEmail({ body: { name, email, password } })
  return prisma.user.update({
    where: { email },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
}

export async function deleteUser(id: string) {
  return prisma.$transaction([
    prisma.session.deleteMany({ where: { userId: id } }),
    prisma.ticket.updateMany({ where: { assignedAgentId: id }, data: { assignedAgentId: null } }),
    prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true },
    }),
  ])
}

export async function updateUser(id: string, data: UpdateUserData) {
  if (data.password) {
    const hashed = await hashPassword(data.password)
    await prisma.account.updateMany({
      where: { userId: id, providerId: 'credential' },
      data: { password: hashed },
    })
  }
  return prisma.user.update({
    where: { id },
    data: { name: data.name, email: data.email, role: data.role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })
}
