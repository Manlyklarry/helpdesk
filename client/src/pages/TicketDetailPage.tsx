import { Link, useParams, useNavigate } from 'react-router'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '../components/Navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
import { StatusBadge, CategoryBadge } from '@/components/ticket-badges'
import { ReplyBox } from '@/components/ReplyBox'
import { useTicketPatch } from '@/hooks/useTicketPatch'
import { useSummarize } from '@/hooks/useSummarize'
import { SenderType, type TicketDetail } from '@/types/ticket'
import type { AgentSummary } from '@/types/user'

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

function SidebarSelect({
  label,
  value,
  onChange,
  isPending,
  error,
  children,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  isPending: boolean
  error: string | null
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <select
        disabled={isPending}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50"
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

function StatusSelect({ ticketId, currentStatus }: { ticketId: number; currentStatus: TicketDetail['status'] }) {
  const { mutate, isPending, error } = useTicketPatch(
    (status: string) =>
      axios.patch(`/api/tickets/${ticketId}/status`, { status }, { withCredentials: true }),
    [['ticket', String(ticketId)], ['tickets']],
    'Failed to update status',
  )
  return (
    <SidebarSelect label="Status" value={currentStatus} onChange={mutate} isPending={isPending} error={error}>
      <option value="open">Open</option>
      <option value="resolved">Resolved</option>
      <option value="closed">Closed</option>
    </SidebarSelect>
  )
}

function CategorySelect({ ticketId, currentCategory }: { ticketId: number; currentCategory: TicketDetail['category'] }) {
  const { mutate, isPending, error } = useTicketPatch(
    (category: string | null) =>
      axios.patch(`/api/tickets/${ticketId}/category`, { category }, { withCredentials: true }),
    [['ticket', String(ticketId)], ['tickets']],
    'Failed to update category',
  )
  return (
    <SidebarSelect
      label="Category"
      value={currentCategory ?? ''}
      onChange={(v) => mutate(v || null)}
      isPending={isPending}
      error={error}
    >
      <option value="">None</option>
      <option value="general">General</option>
      <option value="technical">Technical</option>
      <option value="refund">Refund</option>
    </SidebarSelect>
  )
}

function AgentSelect({ ticketId, currentAgent }: { ticketId: number; currentAgent: TicketDetail['assignedAgent'] }) {
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      axios
        .get<AgentSummary[]>('/api/users/agents', { withCredentials: true })
        .then((r) => r.data),
  })
  const { mutate: assign, isPending, error } = useTicketPatch(
    (agentId: string | null) =>
      axios.patch(`/api/tickets/${ticketId}/assign`, { agentId }, { withCredentials: true }),
    [['ticket', String(ticketId)]],
    'Failed to assign ticket',
  )
  return (
    <SidebarSelect
      label="Assigned agent"
      value={currentAgent?.id ?? ''}
      onChange={(v) => assign(v || null)}
      isPending={isPending}
      error={error}
    >
      <option value="">Unassigned</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>{a.name}</option>
      ))}
    </SidebarSelect>
  )
}

function TicketSummary({ ticketId, messageCount }: { ticketId: number; messageCount: number }) {
  const { summarize, isSummarizing, summary, error } = useSummarize(ticketId)

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => summarize()}
          disabled={isSummarizing || messageCount === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <span>✨</span>
          {isSummarizing ? 'Summarizing…' : summary ? 'Re-summarize' : 'Summarize'}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {summary && (
        <Card className="mt-3 border-purple-100 bg-purple-50/30">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-purple-500 uppercase tracking-wide mb-3">AI Summary</p>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</div>
          </CardContent>
        </Card>
      )}
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
  const isNotFound = axios.isAxiosError(error) && error.response?.status === 404

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
                {ticket.category && <CategoryBadge category={ticket.category} />}
              </div>

              {/* Message thread */}
              <div className="space-y-4">
                {ticket.messages.length === 0 ? (
                  <p className="text-sm text-gray-400 py-8 text-center">No messages yet</p>
                ) : (
                  ticket.messages.map((msg) => (
                    <Card
                      key={msg.id}
                      className={msg.senderType === SenderType.agent ? 'border-blue-100 bg-blue-50/30' : ''}
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
                                msg.senderType === SenderType.customer
                                  ? 'bg-gray-100 text-gray-600'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {msg.senderType === SenderType.customer ? 'Customer' : 'Agent'}
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

              <TicketSummary ticketId={ticket.id} messageCount={ticket.messages.length} />

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
                  {ticket.resolvedByAi && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-violet-50 px-3 py-2">
                      <span className="text-xs font-medium text-violet-700">✦ Resolved by AI</span>
                    </div>
                  )}
                  <hr className="border-gray-100" />
                  <StatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
                  <CategorySelect ticketId={ticket.id} currentCategory={ticket.category} />
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
