import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import {
  Inbox,
  FolderOpen,
  Loader2,
  CheckCircle2,
  Bot,
  Percent,
  Timer,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { DashboardStats, TicketsPerDay } from '@/types/dashboard'

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  if (hours < 24) return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}

function formatChartDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

type Color = {
  bg: string
  icon: string
  accent: string
}

const COLORS = {
  blue:    { bg: 'bg-blue-50 dark:bg-blue-950/40',    icon: 'text-blue-600 dark:text-blue-400',   accent: 'border-l-blue-500' },
  amber:   { bg: 'bg-amber-50 dark:bg-amber-950/40',  icon: 'text-amber-600 dark:text-amber-400', accent: 'border-l-amber-500' },
  violet:  { bg: 'bg-violet-50 dark:bg-violet-950/40', icon: 'text-violet-600 dark:text-violet-400', accent: 'border-l-violet-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', icon: 'text-emerald-600 dark:text-emerald-400', accent: 'border-l-emerald-500' },
  pink:    { bg: 'bg-pink-50 dark:bg-pink-950/40',    icon: 'text-pink-600 dark:text-pink-400',   accent: 'border-l-pink-500' },
  zinc:    { bg: 'bg-zinc-100 dark:bg-zinc-800/60',   icon: 'text-zinc-500 dark:text-zinc-400',   accent: 'border-l-zinc-400' },
}

type StatCardProps = {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  color: Color
  valueClass?: string
}

function StatCard({ title, value, description, icon: Icon, color, valueClass }: StatCardProps) {
  return (
    <div className={cn(
      'rounded-xl bg-card border border-border border-l-[3px] p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-px',
      color.accent,
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80">
          {title}
        </p>
        <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', color.bg)}>
          <Icon className={cn('h-4 w-4', color.icon)} />
        </div>
      </div>
      <p className={cn('text-[28px] font-bold tabular-nums leading-none text-foreground', valueClass)}>
        {value}
      </p>
      {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-border border-l-[3px] border-l-border p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20 mt-1" />
      <Skeleton className="h-3 w-28 mt-2" />
    </div>
  )
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ value: number; name: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value} {payload[0].value === 1 ? 'ticket' : 'tickets'}
      </p>
    </div>
  )
}

function TicketsChart({ data }: { data: TicketsPerDay[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatChartDate(d.date) }))
  const maxCount = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-foreground">Ticket volume</h3>
        <span className="text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">Last 30 days</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            interval={4}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            tickLine={false}
            axisLine={false}
            width={28}
            domain={[0, maxCount + 1]}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5, radius: 4 }} />
          <Bar
            dataKey="count"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
            opacity={0.9}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const SKELETON_BARS = [35, 55, 40, 70, 50, 30, 60, 45, 80, 35, 55, 65, 40, 75, 50, 30, 60, 45, 55, 70, 35, 50, 65, 40, 75, 50, 45, 60, 35, 55]

function TicketsChartSkeleton() {
  return (
    <div className="rounded-xl bg-card border border-border p-6 shadow-sm">
      <Skeleton className="h-4 w-52 mb-5" />
      <div className="flex items-end gap-1.5 h-[220px] px-2">
        {SKELETON_BARS.map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  )
}

export function HomePage() {
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () =>
      axios
        .get<DashboardStats>('/api/dashboard/stats', { withCredentials: true })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })

  const { data: chartData, isLoading: chartLoading, error: chartError } = useQuery({
    queryKey: ['dashboard-tickets-per-day'],
    queryFn: () =>
      axios
        .get<TicketsPerDay[]>('/api/dashboard/tickets-per-day', { withCredentials: true })
        .then((r) => r.data),
    refetchInterval: 30_000,
  })

  const errorMessage = statsError
    ? axiosError(statsError, 'Failed to load dashboard')
    : chartError
      ? axiosError(chartError, 'Failed to load chart data')
      : null

  return (
    <main className="mx-auto max-w-7xl px-6 lg:px-8 py-8 fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Live overview of your support queue</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-all duration-150 shadow-sm cursor-pointer"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <p className="text-sm text-destructive">{errorMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statsLoading ? (
          Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatCard
              title="Total Tickets"
              value={stats.totalTickets}
              description="All time"
              icon={Inbox}
              color={COLORS.blue}
            />
            <StatCard
              title="Open Tickets"
              value={stats.openTickets}
              description="Awaiting response"
              icon={FolderOpen}
              color={COLORS.amber}
              valueClass={stats.openTickets > 0 ? 'text-amber-600 dark:text-amber-400' : undefined}
            />
            <StatCard
              title="Processing"
              value={stats.processingTickets}
              description="AI in progress"
              icon={Loader2}
              color={COLORS.violet}
              valueClass={stats.processingTickets > 0 ? 'text-violet-600 dark:text-violet-400' : undefined}
            />
            <StatCard
              title="Resolved"
              value={stats.resolvedTickets}
              description="Resolved + closed"
              icon={CheckCircle2}
              color={COLORS.emerald}
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              title="AI Resolved"
              value={stats.aiResolvedTickets}
              description="Handled without agent"
              icon={Bot}
              color={COLORS.blue}
            />
            <StatCard
              title="AI Rate"
              value={`${stats.aiResolutionRate}%`}
              description="Of all resolved"
              icon={Percent}
              color={COLORS.pink}
            />
            <StatCard
              title="Avg Resolution"
              value={
                stats.avgResolutionTimeMs !== null
                  ? formatDuration(stats.avgResolutionTimeMs)
                  : '—'
              }
              description={
                stats.avgResolutionTimeMs !== null ? 'From open to resolved' : 'No data yet'
              }
              icon={Timer}
              color={COLORS.zinc}
            />
          </>
        ) : null}
      </div>

      {chartLoading ? (
        <TicketsChartSkeleton />
      ) : chartData ? (
        <TicketsChart data={chartData} />
      ) : null}
    </main>
  )
}
