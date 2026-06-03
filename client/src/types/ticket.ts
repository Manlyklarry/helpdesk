export const TicketStatus = {
  open: 'open',
  resolved: 'resolved',
  closed: 'closed',
} as const

export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus]

export const TicketCategory = {
  general: 'general',
  technical: 'technical',
  refund: 'refund',
} as const

export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory]

export type Ticket = {
  id: number
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  fromEmail: string
  fromName: string
  createdAt: string
  updatedAt: string
  _count?: { messages: number }
  assignedAgent: { id: string; name: string; email: string } | null
}

export type PaginatedTickets = {
  data: Ticket[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export type TicketMessage = {
  id: number
  ticketId: number
  messageId: string
  direction: 'inbound' | 'outbound'
  fromEmail: string
  fromName: string
  body: string
  htmlBody: string | null
  createdAt: string
}

export type TicketDetail = Ticket & {
  messages: TicketMessage[]
}
