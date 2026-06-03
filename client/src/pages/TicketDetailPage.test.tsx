import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router'
import axios from 'axios'
import { TicketDetailPage } from './TicketDetailPage'

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({
      data: { user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' } },
      isPending: false,
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}))

const MOCK_AGENTS = [
  { id: 'u1', name: 'John Agent', email: 'john@agent.com' },
  { id: 'u2', name: 'Jane Agent', email: 'jane@agent.com' },
]

const MOCK_MESSAGES = [
  {
    id: 1,
    ticketId: 1,
    messageId: 'msg-1',
    direction: 'inbound' as const,
    fromEmail: 'alice@example.com',
    fromName: 'Alice Johnson',
    body: 'Hi, I need help with my login page.',
    htmlBody: null,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 2,
    ticketId: 1,
    messageId: 'msg-2',
    direction: 'outbound' as const,
    fromEmail: 'agent@helpdesk.com',
    fromName: 'Support Agent',
    body: 'Hello! I will look into this for you right away.',
    htmlBody: null,
    createdAt: '2024-01-15T10:30:00.000Z',
  },
]

const MOCK_TICKET = {
  id: 1,
  subject: 'Login page not loading',
  status: 'open' as const,
  category: 'technical' as const,
  fromEmail: 'alice@example.com',
  fromName: 'Alice Johnson',
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  assignedAgent: null,
  messages: MOCK_MESSAGES,
}

function mockGet(ticketOverride?: Partial<typeof MOCK_TICKET>) {
  vi.spyOn(axios, 'get').mockImplementation((url: unknown) => {
    if ((url as string).includes('/agents')) return Promise.resolve({ data: MOCK_AGENTS })
    return Promise.resolve({ data: { ...MOCK_TICKET, ...ticketOverride } })
  })
}

function renderPage(id = '1') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[`/tickets/${id}`]}>
      <QueryClientProvider client={client}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('TicketDetailPage', () => {
  beforeEach(() => mockGet())
  afterEach(() => vi.restoreAllMocks())

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows skeleton while loading and hides the ticket subject', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
    expect(screen.queryByText('Login page not loading')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Ticket content
  // ---------------------------------------------------------------------------

  it('renders the ticket subject as a heading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
  })

  it('renders a blue badge for an open ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('open')).toBeInTheDocument())
    expect(screen.getByText('open')).toHaveClass('bg-blue-50')
  })

  it('renders a green badge for a resolved ticket', async () => {
    mockGet({ status: 'resolved' })
    renderPage()
    await waitFor(() => expect(screen.getByText('resolved')).toBeInTheDocument())
    expect(screen.getByText('resolved')).toHaveClass('bg-green-50')
  })

  it('renders a gray badge for a closed ticket', async () => {
    mockGet({ status: 'closed' })
    renderPage()
    await waitFor(() => expect(screen.getByText('closed')).toBeInTheDocument())
    expect(screen.getByText('closed')).toHaveClass('bg-gray-100')
  })

  it('renders a purple badge for a technical ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('technical')).toBeInTheDocument())
    expect(screen.getByText('technical')).toHaveClass('bg-purple-50')
  })

  it('renders an amber badge for a refund ticket', async () => {
    mockGet({ category: 'refund' })
    renderPage()
    await waitFor(() => expect(screen.getByText('refund')).toBeInTheDocument())
    expect(screen.getByText('refund')).toHaveClass('bg-amber-50')
  })

  it('renders a gray badge for a general ticket', async () => {
    mockGet({ category: 'general' })
    renderPage()
    await waitFor(() => expect(screen.getByText('general')).toBeInTheDocument())
    expect(screen.getByText('general')).toHaveClass('bg-gray-100')
  })

  it('shows no category badge when category is null', async () => {
    mockGet({ category: null })
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    expect(screen.queryByText('technical')).not.toBeInTheDocument()
    expect(screen.queryByText('refund')).not.toBeInTheDocument()
    expect(screen.queryByText('general')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Sidebar metadata
  // ---------------------------------------------------------------------------

  it('shows the sender name and email in the sidebar', async () => {
    renderPage()
    // fromName appears in both the sidebar and the message thread — use getAllByText
    await waitFor(() => expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0))
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows the opened date in the sidebar', async () => {
    renderPage()
    const expected = new Date('2024-01-15T10:00:00.000Z').toLocaleString()
    await waitFor(() => {
      const matches = screen.getAllByText(expected)
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  it('shows the last updated date in the sidebar', async () => {
    renderPage()
    const expected = new Date('2024-01-15T12:00:00.000Z').toLocaleString()
    await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
  })

  it('shows the message count in the sidebar', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Message thread
  // ---------------------------------------------------------------------------

  it('renders each message body in the thread', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Hi, I need help with my login page.')).toBeInTheDocument(),
    )
    expect(screen.getByText('Hello! I will look into this for you right away.')).toBeInTheDocument()
  })

  it('renders the sender name for each message', async () => {
    renderPage()
    // Alice Johnson appears in both the sidebar and the message thread
    await waitFor(() => expect(screen.getAllByText('Alice Johnson').length).toBeGreaterThan(0))
    expect(screen.getByText('Support Agent')).toBeInTheDocument()
  })

  it('shows a "Customer" pill for inbound messages', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Customer')).toBeInTheDocument())
  })

  it('shows an "Agent" pill for outbound messages', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Agent')).toBeInTheDocument())
  })

  it('shows "No messages yet" when the ticket has no messages', async () => {
    mockGet({ messages: [] })
    renderPage()
    await waitFor(() => expect(screen.getByText('No messages yet')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Not found / error states
  // ---------------------------------------------------------------------------

  it('shows "Ticket not found" for a 404 response', async () => {
    const err = Object.assign(new Error('Not Found'), {
      isAxiosError: true,
      response: { status: 404, data: { error: 'Ticket not found' } },
    })
    vi.spyOn(axios, 'get').mockRejectedValue(err)
    renderPage()
    await waitFor(() => expect(screen.getByText('Ticket not found')).toBeInTheDocument())
  })

  it('shows a generic error message when the request fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Failed to load ticket')).toBeInTheDocument())
  })

  it('shows the server error message from the response body', async () => {
    const err = Object.assign(new Error('Internal Server Error'), {
      isAxiosError: true,
      response: { status: 500, data: { error: 'Database connection failed' } },
    })
    vi.spyOn(axios, 'get').mockRejectedValue(err)
    renderPage()
    await waitFor(() => expect(screen.getByText('Database connection failed')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // AgentSelect (sidebar)
  // ---------------------------------------------------------------------------

  it('shows "Unassigned" as the selected option when no agent is assigned', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('shows the current agent as selected when a ticket is already assigned', async () => {
    mockGet({ assignedAgent: { id: 'u1', name: 'John Agent', email: 'john@agent.com' } })
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement
      expect(select.value).toBe('u1')
    })
  })

  it('lists available agents as options in the dropdown', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    await waitFor(() => {
      expect(screen.getByText('John Agent')).toBeInTheDocument()
      expect(screen.getByText('Jane Agent')).toBeInTheDocument()
    })
  })

  it('calls PATCH /api/tickets/:id/assign when an agent is selected', async () => {
    const patchSpy = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    renderPage()
    await waitFor(() => expect(screen.getByText('John Agent')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'u1' } })

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        '/api/tickets/1/assign',
        { agentId: 'u1' },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  it('calls PATCH with null when "Unassigned" is selected', async () => {
    mockGet({ assignedAgent: { id: 'u1', name: 'John Agent', email: 'john@agent.com' } })
    const patchSpy = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    renderPage()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } })

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        '/api/tickets/1/assign',
        { agentId: null },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  // ---------------------------------------------------------------------------
  // ReplyBox
  // ---------------------------------------------------------------------------

  it('disables the send button when the reply textarea is empty', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('enables the send button once text is typed', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Here is my reply.' },
    })
    expect(screen.getByRole('button', { name: 'Send reply' })).not.toBeDisabled()
  })

  it('calls POST /api/tickets/:id/messages when the send button is clicked', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 99 } })
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Here is my reply.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        '/api/tickets/1/messages',
        { body: 'Here is my reply.' },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  it('clears the textarea after a successful send', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 99 } })
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())

    const textarea = screen.getByPlaceholderText('Type your reply…') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Here is my reply.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => expect(textarea.value).toBe(''))
  })

  it('shows an error message when the send fails', async () => {
    const err = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: { data: { error: 'Reply cannot be empty' } },
    })
    vi.spyOn(axios, 'post').mockRejectedValue(err)
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => expect(screen.getByText('Reply cannot be empty')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  it('shows a "Back to tickets" button', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/Back to tickets/i)).toBeInTheDocument())
  })
})
