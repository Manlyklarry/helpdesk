import type { Request, Response, NextFunction } from 'express'
import * as Sentry from '@sentry/node'
import { auth } from '../lib/auth.js'

type BetterAuthSession = typeof auth.$Infer.Session

export type AuthUser = BetterAuthSession['user']
export type AuthSession = BetterAuthSession['session']

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      authSession?: AuthSession
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: req.headers as unknown as Headers,
  })

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.user = session.user
  req.authSession = session.session
  Sentry.setUser({ id: session.user.id, email: session.user.email })
  next()
}
