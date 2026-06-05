import { Badge } from '@/components/ui/badge'
import { TicketStatus, TicketCategory } from '@/types/ticket'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.new]: 'bg-slate-100 text-slate-600 ring-slate-500/10',
    [TicketStatus.processing]: 'bg-orange-50 text-orange-700 ring-orange-700/10',
    [TicketStatus.open]: 'bg-blue-50 text-blue-700 ring-blue-700/10',
    [TicketStatus.resolved]: 'bg-green-50 text-green-700 ring-green-700/10',
    [TicketStatus.closed]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
  }
  return <Badge className={styles[status]}>{status}</Badge>
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.general]: 'bg-gray-100 text-gray-600 ring-gray-500/10',
    [TicketCategory.technical]: 'bg-purple-50 text-purple-700 ring-purple-700/10',
    [TicketCategory.refund]: 'bg-amber-50 text-amber-700 ring-amber-700/10',
  }
  return <Badge className={styles[category]}>{category}</Badge>
}
