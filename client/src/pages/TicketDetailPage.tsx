import { Link, useParams, useNavigate } from 'react-router'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronLeft, Bot } from 'lucide-react'
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
              <div key={i} className="rounded-xl border border-border p-5">
                <div className="flex justify-between mb-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-xl border border-border p-5 space-y-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>
    </div>
  )
}

function SidebarField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function SidebarSelect({ label, value, onChange, isPending, error, children }: {
  label: string; value: string; onChange: (val: string) => void; isPending: boolean; error: string | null; children: React.ReactNode
}) {
  return (
    <SidebarField label={label}>
      <select
        disabled={isPending}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-colors"
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </SidebarField>
  )
}

function StatusSelect({ ticketId, currentStatus }: { ticketId: number; currentStatus: TicketDetail['status'] }) {
  const { mutate, isPending, error } = useTicketPatch(
    (status: string) => axios.patch(`/api/tickets/${ticketId}/status`, { status }, { withCredentials: true }),
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
    (category: string | null) => axios.patch(`/api/tickets/${ticketId}/category`, { category }, { withCredentials: true }),
    [['ticket', String(ticketId)], ['tickets']],
    'Failed to update category',
  )
  return (
    <SidebarSelect label="Category" value={currentCategory ?? ''} onChange={(v) => mutate(v || null)} isPending={isPending} error={error}>
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
    queryFn: () => axios.get<AgentSummary[]>('/api/users/agents', { withCredentials: true }).then((r) => r.data),
  })
  const { mutate: assign, isPending, error } = useTicketPatch(
    (agentId: string | null) => axios.patch(`/api/tickets/${ticketId}/assign`, { agentId }, { withCredentials: true }),
    [['ticket', String(ticketId)]],
    'Failed to assign ticket',
  )
  return (
    <SidebarSelect label="Assigned agent" value={currentAgent?.id ?? ''} onChange={(v) => assign(v || null)} isPending={isPending} error={error}>
      <option value="">Unassigned</option>
      {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg border border-border bg-card text-muted-foreground text-sm font-medium hover:text-foreground hover:border-primary/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
        >
          <span>✨</span>
          {isSummarizing ? 'Summarizing…' : summary ? 'Re-summarize' : 'Summarize'}
        </button>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      {summary && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-5">
          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">AI Summary</p>
          <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{summary}</div>
        </div>
      )}
    </div>
  )
}

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => axios.get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true }).then((r) => r.data),
    enabled: !!id,
  })

  const errorMessage = error ? axiosError(error, 'Failed to load ticket') : null
  const isNotFound = axios.isAxiosError(error) && error.response?.status === 404

  return (
    <main className="mx-auto max-w-6xl px-6 lg:px-8 py-10 fade-in">
      <button
        onClick={() => navigate('/tickets')}
        className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to tickets
      </button>

      {isLoading && <SkeletonDetail />}

      {!isLoading && isNotFound && (
        <div className="text-center py-20">
          <p className="text-lg font-medium text-foreground mb-2">Ticket not found</p>
          <p className="text-sm text-muted-foreground">This ticket may have been deleted or the ID is invalid.</p>
          <Link to="/tickets" className="mt-6 inline-block text-sm text-primary hover:underline">Back to tickets</Link>
        </div>
      )}

      {!isLoading && errorMessage && !isNotFound && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {!isLoading && ticket && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl font-semibold text-foreground mb-3">
              {ticket.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <StatusBadge status={ticket.status} />
              {ticket.category && <CategoryBadge category={ticket.category} />}
            </div>

            {/* Message thread */}
            <div className="space-y-3">
              {ticket.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No messages yet</p>
              ) : (
                ticket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl border overflow-hidden ${
                      msg.senderType === SenderType.agent
                        ? 'border-primary/20 bg-primary/5 dark:bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3 gap-4">
                        <div className="text-sm">
                          <span className="font-medium text-foreground">{msg.fromName}</span>
                          <span className="text-muted-foreground ml-1">&lt;{msg.fromEmail}&gt;</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            msg.senderType === SenderType.customer
                              ? 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {msg.senderType === SenderType.customer ? 'Customer' : 'Agent'}
                          </span>
                          <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <TicketSummary ticketId={ticket.id} messageCount={ticket.messages.length} />
            <ReplyBox ticketId={ticket.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-5">
              <SidebarField label="From">
                <p className="text-sm font-medium text-foreground">{ticket.fromName}</p>
                <p className="text-xs text-muted-foreground">{ticket.fromEmail}</p>
              </SidebarField>
              <SidebarField label="Opened">
                <p className="text-sm text-foreground">{new Date(ticket.createdAt).toLocaleString()}</p>
              </SidebarField>
              <SidebarField label="Last updated">
                <p className="text-sm text-foreground">{new Date(ticket.updatedAt).toLocaleString()}</p>
              </SidebarField>
              <SidebarField label="Messages">
                <p className="text-sm text-foreground">{ticket.messages.length}</p>
              </SidebarField>
              {ticket.resolvedByAi && (
                <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-primary">Resolved by AI</span>
                </div>
              )}
              <div className="border-t border-border pt-4 space-y-4">
                <StatusSelect ticketId={ticket.id} currentStatus={ticket.status} />
                <CategorySelect ticketId={ticket.id} currentCategory={ticket.category} />
                <AgentSelect ticketId={ticket.id} currentAgent={ticket.assignedAgent} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
