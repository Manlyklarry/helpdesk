import { useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { axiosError } from '@/lib/api'
import { usePolishReply } from '@/hooks/usePolishReply'
import { Button } from '@/components/ui/button'

type ReplyBoxProps = { ticketId: number }

export function ReplyBox({ ticketId }: ReplyBoxProps) {
  const queryClient = useQueryClient()
  const [body, setBody] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)

  const { mutate: sendReply, isPending } = useMutation({
    mutationFn: () => axios.post(`/api/tickets/${ticketId}/messages`, { body }, { withCredentials: true }),
    onSuccess: () => {
      setBody('')
      setSendError(null)
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] })
    },
    onError: (err) => setSendError(axiosError(err, 'Failed to send reply')),
  })

  const { polish, isPolishing, error: polishError } = usePolishReply(ticketId, setBody)
  const error = sendError ?? polishError

  return (
    <div className="mt-8">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reply</p>
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <textarea
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your reply…"
          className="w-full px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground bg-transparent resize-none focus:outline-none"
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
          {error ? <p className="text-xs text-destructive">{error}</p> : <span />}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => polish(body)}
              disabled={isPolishing || isPending || !body.trim()}
              className="text-muted-foreground hover:text-foreground"
            >
              {isPolishing ? 'Polishing…' : '✨ Polish'}
            </Button>
            <Button
              size="sm"
              onClick={() => sendReply()}
              disabled={isPending || isPolishing || !body.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isPending ? 'Sending…' : 'Send reply'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
