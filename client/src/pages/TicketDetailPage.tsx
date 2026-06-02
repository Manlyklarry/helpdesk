import { useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Navbar } from '../components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
import { TicketStatus, TicketCategory, type TicketDetail } from '@/types/ticket'
import type { User } from '@/types/user'

function StatusBadge({ status }: { status: TicketDetail['status'] }) {
  const styles: Record<string, string> = {
    [TicketStatus.open]: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    [TicketStatus.resolved]: 'bg-green-50 text-green-700 ring-green-700/10',
    [TicketStatus.closed]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  }
  return <Badge className={styles[status]}>{status}</Badge>
}

function CategoryBadge({ category }: { category: TicketDetail['category'] }) {
  if (!category) return null
  const styles: Record<string, string> = {
    [TicketCategory.general]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
    [TicketCategory.technical]: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    [TicketCategory.refund]: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  }
  return <Badge className={styles[category]}>{category}</Badge>
}

function SkeletonDetail() {
  return (
    <div>
      <Skeleton className="h-4 w-28 mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-8 w-96 mb-4" />
          <div className="flex gap-2 mb-6">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex justify-between mb-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-4 w-28" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

type AgentSelectProps = {
  ticketId: number
  currentAgent: TicketDetail['assignedAgent']
}

function AgentSelect({ ticketId, currentAgent }: AgentSelectProps) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      axios
        .get<Pick<User, 'id' | 'name' | 'email'>[]>('/api/users/agents', { withCredentials: true })
        .then((r) => r.data),
  })

  const { mutate: assign, isPending } = useMutation({
    mutationFn: (agentId: string | null) =>
      axios.patch(`/api/tickets/${ticketId}/assign`, { agentId }, { withCredentials: true }),
    onSuccess: () => {
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['ticket', String(ticketId)] })
    },
    onError: (err) => setError(axiosError(err, 'Failed to assign ticket')),
  })

  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Assigned agent</p>
      <select
        disabled={isPending}
        value={currentAgent?.id ?? ''}
        onChange={(e) => assign(e.target.value || null)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

type ReplyBoxProps = {
  ticketId: number
}

function ReplyBox({ ticketId }: ReplyBoxProps) {
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

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () =>
      axios
        .get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true })
        .then((r) => r.data),
    enabled: !!id,
  })

  const errorMessage = error ? axiosError(error, 'Failed to load ticket') : null
  const isNotFound =
    error && (error as { response?: { status?: number } }).response?.status === 404

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/tickets')}
          className="mb-8 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Back to tickets
        </button>

        {isLoading && <SkeletonDetail />}

        {!isLoading && isNotFound && (
          <div className="text-center py-20">
            <p className="text-lg font-medium text-gray-700 mb-2">Ticket not found</p>
            <p className="text-sm text-gray-500">
              This ticket may have been deleted or the ID is invalid.
            </p>
            <Link to="/tickets" className="mt-6 inline-block text-sm text-blue-600 hover:underline">
              Back to tickets
            </Link>
          </div>
        )}

        {!isLoading && errorMessage && !isNotFound && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}

        {!isLoading && ticket && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main column: ticket header + messages + reply */}
            <div className="lg:col-span-2">
              <h1 className="text-2xl font-semibold text-gray-900 mb-3">{ticket.subject}</h1>
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <StatusBadge status={ticket.status} />
                <CategoryBadge category={ticket.category} />
              </div>

              {/* Message thread */}
              <div className="space-y-4">
                {ticket.messages.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No messages yet</p>
                ) : (
                  ticket.messages.map((msg) => (
                    <Card
                      key={msg.id}
                      className={msg.direction === 'outbound' ? 'border-blue-100 bg-blue-50/30' : ''}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3 gap-4">
                          <div className="text-sm">
                            <span className="font-medium text-gray-800">{msg.fromName}</span>
                            <span className="text-gray-400 ml-1">&lt;{msg.fromEmail}&gt;</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                msg.direction === 'inbound'
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {msg.direction === 'inbound' ? 'Customer' : 'Agent'}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(msg.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {msg.body}
                        </p>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <ReplyBox ticketId={ticket.id} />
            </div>

            {/* Sidebar: ticket metadata */}
            <div className="space-y-4">
              <Card>
                <CardContent className="p-5 space-y-5">
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">From</p>
                    <p className="text-sm font-medium text-gray-800">{ticket.fromName}</p>
                    <p className="text-xs text-gray-400">{ticket.fromEmail}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Opened</p>
                    <p className="text-sm text-gray-700">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Last updated</p>
                    <p className="text-sm text-gray-700">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Messages</p>
                    <p className="text-sm text-gray-700">{ticket.messages.length}</p>
                  </div>
                  <hr className="border-gray-100" />
                  <AgentSelect ticketId={ticket.id} currentAgent={ticket.assignedAgent} />
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
