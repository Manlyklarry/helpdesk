import { PgBoss } from 'pg-boss'

const globalForBoss = global as unknown as { boss: PgBoss }

function createBoss() {
  return new PgBoss(process.env.DATABASE_URL!)
}

export const boss = globalForBoss.boss ?? createBoss()

if (process.env.NODE_ENV !== 'production') globalForBoss.boss = boss
