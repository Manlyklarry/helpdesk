import type { AgentSummary } from './user'

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

export const SenderType = {
  customer: 'customer',
  agent: 'agent',
} as const
export type SenderType = (typeof SenderType)[keyof typeof SenderType]

export const MessageDirection = {
  inbound: 'inbound',
  outbound: 'outbound',
} as const
export type MessageDirection = (typeof MessageDirection)[keyof typeof MessageDirection]

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
  assignedAgent: AgentSummary | null
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
  direction: MessageDirection
  senderType: SenderType
  fromEmail: string
  fromName: string
  body: string
  htmlBody: string | null
  createdAt: string
}

export type TicketDetail = Ticket & {
  bodyHtml: string | null
  messages: TicketMessage[]
}
