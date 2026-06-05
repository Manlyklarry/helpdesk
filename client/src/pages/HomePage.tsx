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
  type TooltipProps,
} from 'recharts'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { axiosError } from '@/lib/api'
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
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type StatCardProps = {
  title: string
  value: string | number
  description?: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueColor?: string
}

function StatCard({ title, value, description, icon: Icon, iconBg, iconColor, valueColor }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
            <p className={`text-3xl font-bold mt-1.5 tabular-nums ${valueColor ?? 'text-gray-900'}`}>
              {value}
            </p>
            {description && (
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            )}
          </div>
          <div className={`shrink-0 p-2.5 rounded-xl ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-20" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-900">
        {payload[0].value} {payload[0].value === 1 ? 'ticket' : 'tickets'}
      </p>
    </div>
  )
}

function TicketsChart({ data }: { data: TicketsPerDay[] }) {
  const chartData = data.map((d) => ({ ...d, label: formatChartDate(d.date) }))
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-gray-900">
          Ticket volume — last 30 days
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pr-6">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid
              vertical={false}
              stroke="#f3f4f6"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval={4}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              width={28}
              domain={[0, maxCount + 1]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f9fafb', radius: 4 }} />
            <Bar
              dataKey="count"
              fill="#6366f1"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

const SKELETON_BAR_HEIGHTS = [35,55,40,70,50,30,60,45,80,35,55,65,40,75,50,30,60,45,55,70,35,50,65,40,75,50,45,60,35,55]

function TicketsChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <Skeleton className="h-5 w-56" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-end gap-1.5 h-[220px] px-2">
          {SKELETON_BAR_HEIGHTS.map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function HomePage() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch, isFetching } = useQuery({
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Live overview of your support queue</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Metrics grid */}
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
                iconBg="bg-indigo-50"
                iconColor="text-indigo-600"
              />
              <StatCard
                title="Open Tickets"
                value={stats.openTickets}
                description="Awaiting agent response"
                icon={FolderOpen}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
                valueColor={stats.openTickets > 0 ? 'text-blue-700' : 'text-gray-900'}
              />
              <StatCard
                title="Processing"
                value={stats.processingTickets}
                description="AI resolution in progress"
                icon={Loader2}
                iconBg="bg-orange-50"
                iconColor="text-orange-600"
                valueColor={stats.processingTickets > 0 ? 'text-orange-700' : 'text-gray-900'}
              />
              <StatCard
                title="Resolved Tickets"
                value={stats.resolvedTickets}
                description="Resolved + closed"
                icon={CheckCircle2}
                iconBg="bg-green-50"
                iconColor="text-green-600"
                valueColor="text-green-700"
              />
              <StatCard
                title="AI Resolved"
                value={stats.aiResolvedTickets}
                description="Handled without agent"
                icon={Bot}
                iconBg="bg-violet-50"
                iconColor="text-violet-600"
                valueColor="text-violet-700"
              />
              <StatCard
                title="AI Resolution Rate"
                value={`${stats.aiResolutionRate}%`}
                description="Of all resolved tickets"
                icon={Percent}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
                valueColor={
                  stats.aiResolutionRate >= 50
                    ? 'text-purple-700'
                    : stats.aiResolutionRate > 0
                    ? 'text-gray-900'
                    : 'text-gray-400'
                }
              />
              <StatCard
                title="Avg Resolution Time"
                value={stats.avgResolutionTimeMs !== null ? formatDuration(stats.avgResolutionTimeMs) : '—'}
                description={stats.avgResolutionTimeMs !== null ? 'From open to resolved' : 'No resolved tickets yet'}
                icon={Timer}
                iconBg="bg-slate-100"
                iconColor="text-slate-600"
              />
            </>
          ) : null}
        </div>

        {/* Daily volume chart */}
        {chartLoading ? (
          <TicketsChartSkeleton />
        ) : chartData ? (
          <TicketsChart data={chartData} />
        ) : null}
      </main>
    </div>
  )
}
