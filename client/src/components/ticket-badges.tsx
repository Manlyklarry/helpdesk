import { TicketStatus, TicketCategory } from '@/types/ticket'
import { cn } from '@/lib/utils'

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    [TicketStatus.new]:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
    [TicketStatus.open]:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    [TicketStatus.processing]:
      'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
    [TicketStatus.resolved]:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    [TicketStatus.closed]:
      'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  }

  const dotStyles: Record<TicketStatus, string> = {
    [TicketStatus.new]: 'bg-blue-500 dark:bg-blue-400',
    [TicketStatus.open]: 'bg-amber-500 dark:bg-amber-400',
    [TicketStatus.processing]: 'bg-violet-500 dark:bg-violet-400',
    [TicketStatus.resolved]: 'bg-emerald-500 dark:bg-emerald-400',
    [TicketStatus.closed]: 'bg-zinc-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotStyles[status])} />
      {status}
    </span>
  )
}

export function CategoryBadge({ category }: { category: TicketCategory }) {
  const styles: Record<TicketCategory, string> = {
    [TicketCategory.general]:
      'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-400',
    [TicketCategory.technical]:
      'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400',
    [TicketCategory.refund]:
      'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[category],
      )}
    >
      {category}
    </span>
  )
}
