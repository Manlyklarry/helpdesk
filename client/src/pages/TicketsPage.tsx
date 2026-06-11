import { useState, useEffect } from 'react'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { StatusBadge, CategoryBadge } from '@/components/ticket-badges'
import { TicketStatus, TicketCategory, type Ticket, type PaginatedTickets } from '@/types/ticket'
import type { AgentSummary } from '@/types/user'

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages: (number | '…')[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    pages.push(1)
    if (page > 3) pages.push('…')
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
      pages.push(i)
    if (page < totalPages - 2) pages.push('…')
    pages.push(totalPages)
  }
  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border">
      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{' '}
        of <span className="font-medium text-foreground">{total}</span> tickets
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Prev
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`e-${i}`} className="px-2 text-sm text-muted-foreground">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={cn(
                'min-w-[32px] px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors',
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}

function InlineAgentSelect({
  ticketId,
  currentAgent,
}: {
  ticketId: number
  currentAgent: Ticket['assignedAgent']
}) {
  const queryClient = useQueryClient()
  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      axios
        .get<AgentSummary[]>('/api/users/agents', { withCredentials: true })
        .then((r) => r.data),
  })
  const { mutate: assign, isPending } = useMutation({
    mutationFn: (agentId: string | null) =>
      axios.patch(`/api/tickets/${ticketId}/assign`, { agentId }, { withCredentials: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tickets'] }),
  })
  return (
    <select
      disabled={isPending}
      value={currentAgent?.id ?? ''}
      onChange={(e) => assign(e.target.value || null)}
      className="w-full max-w-[160px] rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50 transition-colors"
    >
      <option value="">Unassigned</option>
      {agents.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
      ))}
    </select>
  )
}

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Open', value: TicketStatus.open },
  { label: 'Resolved', value: TicketStatus.resolved },
  { label: 'Closed', value: TicketStatus.closed },
]

const CATEGORY_FILTERS = [
  { label: 'All', value: '' },
  { label: 'General', value: TicketCategory.general },
  { label: 'Technical', value: TicketCategory.technical },
  { label: 'Refund', value: TicketCategory.refund },
  { label: 'Uncategorized', value: 'none' },
]

const SKELETON_COLS = ['Subject', 'Sender', 'Category', 'Status', 'Assigned to', 'Date']
const columnHelper = createColumnHelper<Ticket>()

const columns = [
  columnHelper.accessor('subject', {
    header: 'Subject',
    enableSorting: true,
    cell: (info) => (
      <Link
        to={`/tickets/${info.row.original.id}`}
        className="font-medium text-foreground hover:text-primary max-w-[280px] truncate block transition-colors"
      >
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('fromName', {
    header: 'Sender',
    enableSorting: true,
    cell: (info) => (
      <div>
        <div className="text-sm text-foreground">{info.getValue()}</div>
        <div className="text-xs text-muted-foreground">{info.row.original.fromEmail}</div>
      </div>
    ),
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    enableSorting: false,
    cell: (info) => {
      const cat = info.getValue()
      return cat ? (
        <CategoryBadge category={cat} />
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )
    },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    enableSorting: false,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.display({
    id: 'assignedAgent',
    header: 'Assigned to',
    cell: (info) => (
      <InlineAgentSelect
        ticketId={info.row.original.id}
        currentAgent={info.row.original.assignedAgent}
      />
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    enableSorting: true,
    cell: (info) => (
      <span className="text-xs text-muted-foreground">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
]

export function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortDir = (sorting[0]?.desc ?? true) ? 'desc' : 'asc'

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    setPage(1)
  }, [sortBy, sortDir, filterStatus, filterCategory, search])

  const { data: result, isLoading, error } = useQuery({
    queryKey: ['tickets', sortBy, sortDir, filterStatus, filterCategory, search, page],
    queryFn: () =>
      axios
        .get<PaginatedTickets>('/api/tickets', {
          params: {
            sortBy,
            sortDir,
            page,
            ...(filterStatus && { status: filterStatus }),
            ...(filterCategory && { category: filterCategory }),
            ...(search && { search }),
          },
          withCredentials: true,
        })
        .then((r) => r.data),
  })

  const errorMessage = error ? axiosError(error, 'Failed to load tickets') : null

  const table = useReactTable({
    data: result?.data ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <main className="mx-auto max-w-7xl px-6 lg:px-8 py-8 fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage and respond to support requests</p>
        </div>
        {result && (
          <span className="text-sm text-muted-foreground bg-card border border-border rounded-full px-3 py-1 shadow-sm">
            {result.total} total
          </span>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <p className="text-sm font-semibold text-foreground">All tickets</p>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex flex-col gap-3">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z"
              />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by subject, name or email…"
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Status
              </span>
              <div className="flex gap-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterStatus(f.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150',
                      filterStatus === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Category
              </span>
              <div className="flex gap-1">
                {CATEGORY_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilterCategory(f.value)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-150',
                      filterCategory === f.value
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        {isLoading && (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                {SKELETON_COLS.map((col, i) => (
                  <th
                    key={i}
                    className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-3.5"><Skeleton className="h-4 w-48" /></td>
                  <td className="px-6 py-3.5"><Skeleton className="h-4 w-36" /></td>
                  <td className="px-6 py-3.5"><Skeleton className="h-5 w-16 rounded-full" /></td>
                  <td className="px-6 py-3.5"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-6 py-3.5"><Skeleton className="h-6 w-32 rounded-lg" /></td>
                  <td className="px-6 py-3.5"><Skeleton className="h-4 w-20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {errorMessage && (
          <p className="px-6 py-8 text-sm text-destructive">{errorMessage}</p>
        )}

        {!isLoading && !errorMessage && (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      >
                        {header.column.getCanSort() ? (
                          <button
                            className="flex items-center gap-1 hover:text-foreground cursor-pointer select-none transition-colors"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <span className="text-muted-foreground/50">
                              {({ asc: '↑', desc: '↓' } as Record<string, string>)[
                                header.column.getIsSorted() as string
                              ] ?? '↕'}
                            </span>
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-border">
                {table.getRowModel().rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-muted-foreground text-sm"
                    >
                      No tickets yet
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map((row) => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors duration-100 cursor-pointer">
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-6 py-3.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {result && (
              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                pageSize={result.pageSize}
                onPage={setPage}
              />
            )}
          </>
        )}
      </div>
    </main>
  )
}
