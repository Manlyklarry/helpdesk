import { useState } from 'react'
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { axiosError } from '@/lib/api'

/**
 * Shared mutation hook for sidebar ticket field updates.
 * Manages error state, invalidates the supplied query keys on success,
 * and falls back to `fallback` when the server returns no message.
 */
export function useTicketPatch<T>(
  mutationFn: (value: T) => Promise<unknown>,
  invalidate: QueryKey[],
  fallback: string,
) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { mutate, isPending } = useMutation({
    mutationFn,
    onSuccess: () => {
      setError(null)
      invalidate.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
    },
    onError: (err) => setError(axiosError(err, fallback)),
  })

  return { mutate, isPending, error }
}
