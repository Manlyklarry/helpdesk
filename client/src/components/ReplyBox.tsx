import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosError } from '@/lib/api'

type ReplyBoxProps = {
  ticketId: number
}

export function ReplyBox({ ticketId }: ReplyBoxProps) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { mutate: sendReply, isPending } = useMutation({
    mutationFn: () =>
      axios.post(`/api/tickets/${ticketId}/messages`, { body }, { withCredentials: true }),
    onSuccess: () => {
      setBody('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] })
    },
    onError: (err) => setError(axiosError(err, 'Failed to send reply')),
  })

  return (
    <div className="mt-8">
      <p className="text-sm font-medium text-gray-700 mb-2">Reply</p>
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your reply…"
          className="w-full px-4 py-3 text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/40">
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : (
            <span />
          )}
          <button
            onClick={() => sendReply()}
            disabled={isPending || !body.trim()}
            className="px-4 py-1.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Sending…' : 'Send reply'}
          </button>
        </div>
      </div>
    </div>
  )
}
