export type DashboardStats = {
  totalTickets: number
  openTickets: number
  processingTickets: number
  resolvedTickets: number
  aiResolvedTickets: number
  aiResolutionRate: number
  avgResolutionTimeMs: number | null
}

export type TicketsPerDay = {
  date: string
  count: number
}
