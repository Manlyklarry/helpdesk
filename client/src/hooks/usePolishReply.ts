import { useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { axiosError } from '@/lib/api'
import type { PolishReplyResponse } from '@/types/ticket'

export function usePolishReply(ticketId: number, onPolished: (text: string) => void) {
  const [error, setError] = useState<string | null>(null)

  const { mutate: polish, isPending: isPolishing } = useMutation({
    mutationFn: (body: string) =>
      axios.post<PolishReplyResponse>(
        `/api/tickets/${ticketId}/polish-reply`,
        { body },
        { withCredentials: true },
      ),
    onSuccess: ({ data }) => {
      onPolished(data.polished)
      setError(null)
    },
    onError: (err) => setError(axiosError(err, 'Failed to polish reply')),
  })

  return { polish, isPolishing, error }
}
