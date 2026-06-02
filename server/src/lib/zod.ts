import type { ZodError } from 'zod'

export function firstZodError(err: ZodError, fallback = 'Invalid request'): string {
  return err.issues[0]?.message ?? fallback
}
