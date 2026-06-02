import { z } from 'zod'
import type { Resolver } from 'react-hook-form'

export function makeZodResolver<T extends z.ZodTypeAny>(schema: T): Resolver<z.infer<T>> {
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
