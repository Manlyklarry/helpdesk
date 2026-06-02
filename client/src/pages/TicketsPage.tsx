import { useState, useEffect } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { TicketStatus, TicketCategory, type Ticket } from '@/types/ticket'

function StatusBadge({ status }: { status: Ticket['status'] }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.open]: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    [TicketStatus.resolved]: 'bg-green-50 text-green-700 ring-green-700/10',
    [TicketStatus.closed]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  }
  return <Badge className={styles[status]}>{status}</Badge>
}

function CategoryBadge({ category }: { category: Ticket['category'] }) {
  if (!category) return <span className="text-xs text-gray-400">—</span>
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.general]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
    [TicketCategory.technical]: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    [TicketCategory.refund]: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  }
  return <Badge className={styles[category]}>{category}</Badge>
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

const SKELETON_COLS = ['Subject', 'Sender', 'Category', 'Status', 'Date']

const columnHelper = createColumnHelper<Ticket>()

const columns = [
  columnHelper.accessor('subject', {
    header: 'Subject',
    enableSorting: true,
    cell: (info) => (
      <span className="font-medium text-gray-900 max-w-xs truncate block">{info.getValue()}</span>
    ),
  }),
  columnHelper.accessor('fromName', {
    header: 'Sender',
    enableSorting: true,
    cell: (info) => (
      <div className="text-gray-600">
        <div>{info.getValue()}</div>
        <div className="text-xs text-gray-400">{info.row.original.fromEmail}</div>
      </div>
    ),
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    enableSorting: false,
    cell: (info) => <CategoryBadge category={info.getValue()} />,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    enableSorting: false,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    enableSorting: true,
    cell: (info) => (
      <span className="text-gray-500">{new Date(info.getValue()).toLocaleDateString()}</span>
    ),
  }),
]

export function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')

  // Debounce the search input so we only query after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  const sortBy = sorting[0]?.id ?? 'createdAt'
  const sortDir = (sorting[0]?.desc ?? true) ? 'desc' : 'asc'

  const { data: tickets, isLoading, error } = useQuery({
    queryKey: ['tickets', sortBy, sortDir, filterStatus, filterCategory, search],
    queryFn: () =>
      axios
        .get<Ticket[]>('/api/tickets', {
          params: {
            sortBy,
            sortDir,
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
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    manualSorting: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Tickets</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All tickets</CardTitle>
          </CardHeader>

          {/* Filter bar */}
          <div className="px-6 py-4 border-t border-b border-gray-100 bg-gray-50/40 flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.75}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0Z" />
              </svg>
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by subject, name or email…"
                className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Pill filters */}
            <div className="flex flex-wrap items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</span>
                <div className="flex gap-1">
                  {STATUS_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterStatus(f.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        filterStatus === f.value
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Category</span>
                <div className="flex gap-1">
                  {CATEGORY_FILTERS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFilterCategory(f.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        filterCategory === f.value
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100',
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <CardContent className="p-0">
            {isLoading && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  <tr>
                    {SKELETON_COLS.map((col, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-48" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-36" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {errorMessage && (
              <p className="px-6 py-8 text-sm text-destructive">{errorMessage}</p>
            )}
            {!isLoading && !errorMessage && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500"
                        >
                          {header.column.getCanSort() ? (
                            <button
                              className="flex items-center gap-1 hover:text-gray-700 cursor-pointer select-none"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              <span className="text-gray-400">
                                {{ asc: '↑', desc: '↓' }[header.column.getIsSorted() as string] ?? '↕'}
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
                <tbody className="divide-y divide-gray-100">
                  {table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        No tickets yet
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-6 py-4">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
