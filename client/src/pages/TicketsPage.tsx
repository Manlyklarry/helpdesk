import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { TicketStatus, TicketCategory, type Ticket } from '@/types/ticket'

async function fetchTickets(): Promise<Ticket[]> {
  const res = await axios.get<Ticket[]>('/api/tickets', { withCredentials: true })
  return res.data
}

function StatusBadge({ status }: { status: Ticket['status'] }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.open]: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    [TicketStatus.resolved]: 'bg-green-50 text-green-700 ring-green-700/10',
    [TicketStatus.closed]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[status]}`}>
      {status}
    </span>
  )
}

function CategoryBadge({ category }: { category: Ticket['category'] }) {
  if (!category) {
    return <span className="text-xs text-gray-400">—</span>
  }
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.general]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
    [TicketCategory.technical]: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    [TicketCategory.refund]: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[category]}`}>
      {category}
    </span>
  )
}

const TABLE_COLS = ['Subject', 'Sender', 'Category', 'Status', 'Date']

export function TicketsPage() {
  const { data: tickets = [], isLoading, error } = useQuery({
    queryKey: ['tickets'],
    queryFn: fetchTickets,
  })

  const errorMessage =
    axios.isAxiosError(error) && error.response?.data?.error
      ? String(error.response.data.error)
      : error
        ? 'Failed to load tickets'
        : null

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
          <CardContent className="p-0">
            {isLoading && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  <tr>
                    {TABLE_COLS.map((col, i) => (
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
                  <tr>
                    {TABLE_COLS.map((col, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                        No tickets yet
                      </td>
                    </tr>
                  ) : (
                    tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate">
                          {ticket.subject}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          <div>{ticket.fromName}</div>
                          <div className="text-xs text-gray-400">{ticket.fromEmail}</div>
                        </td>
                        <td className="px-6 py-4">
                          <CategoryBadge category={ticket.category} />
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={ticket.status} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </td>
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
