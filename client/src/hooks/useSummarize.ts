import { useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { axiosError } from '@/lib/api'
import type { SummarizeResponse } from '@/types/ticket'

export function useSummarize(ticketId: number) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { mutate: summarize, isPending: isSummarizing } = useMutation({
    mutationFn: () =>
      axios.post<SummarizeResponse>(
        `/api/tickets/${ticketId}/summarize`,
        {},
        { withCredentials: true },
      ),
    onSuccess: ({ data }) => {
      setSummary(data.summary)
      setError(null)
    },
    onError: (err) => setError(axiosError(err, 'Failed to summarize ticket')),
  })

  return { summarize, isSummarizing, summary, error }
}
