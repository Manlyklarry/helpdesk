import { z } from 'zod'
import type { Resolver } from 'react-hook-form'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function makeZodResolver<T extends z.ZodTypeAny>(schema: T): Resolver<any> {
  return async (values) => {
    const result = schema.safeParse(values)
    if (result.success) return { values: result.data, errors: {} }
    const errors: Record<string, { message: string; type: string }> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.')
      if (!errors[key]) errors[key] = { message: issue.message, type: issue.code }
    }
    return { values: {}, errors }
  }
}
