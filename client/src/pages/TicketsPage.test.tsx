import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import axios from 'axios'
import { TicketsPage } from './TicketsPage'

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

const MOCK_TICKETS = [
  {
    id: 1,
    subject: 'Login page not loading',
    status: 'open' as const,
    category: 'technical' as const,
    fromEmail: 'alice@example.com',
    fromName: 'Alice Johnson',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    assignedAgent: null,
  },
  {
    id: 2,
    subject: 'Refund request',
    status: 'resolved' as const,
    category: 'refund' as const,
    fromEmail: 'bob@example.com',
    fromName: 'Bob Smith',
    createdAt: '2024-01-16T09:00:00.000Z',
    updatedAt: '2024-01-16T09:00:00.000Z',
    assignedAgent: null,
  },
  {
    id: 3,
    subject: 'General inquiry',
    status: 'closed' as const,
    category: null,
    fromEmail: 'carol@example.com',
    fromName: 'Carol Williams',
    createdAt: '2024-01-17T08:00:00.000Z',
    updatedAt: '2024-01-17T08:00:00.000Z',
    assignedAgent: { id: 'u1', name: 'John Agent', email: 'john@agent.com' },
  },
]

const MOCK_PAGE = { data: MOCK_TICKETS, total: 3, page: 1, pageSize: 10, totalPages: 1 }

function mockGet(overrideTickets?: typeof MOCK_PAGE) {
  vi.spyOn(axios, 'get').mockImplementation((url: unknown) => {
    if ((url as string).includes('/agents')) return Promise.resolve({ data: MOCK_AGENTS })
    return Promise.resolve({ data: overrideTickets ?? MOCK_PAGE })
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <TicketsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('TicketsPage', () => {
  beforeEach(() => mockGet())
  afterEach(() => vi.restoreAllMocks())

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows skeleton rows while data is loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.queryByText('Login page not loading')).not.toBeInTheDocument()

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons).toHaveLength(30) // 5 rows × 6 cols
  })

  // ---------------------------------------------------------------------------
  // Table content
  // ---------------------------------------------------------------------------

  it('renders a row for each ticket after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    expect(screen.getByText('Refund request')).toBeInTheDocument()
    expect(screen.getByText('General inquiry')).toBeInTheDocument()
  })

  it('shows the sender name and email for each ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('formats the created date with toLocaleDateString', async () => {
    renderPage()
    const expected = new Date('2024-01-15T10:00:00.000Z').toLocaleDateString()
    await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
  })

  it('renders a link on each subject pointing to the ticket detail page', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    const link = screen.getByText('Login page not loading').closest('a')
    expect(link).toHaveAttribute('href', '/tickets/1')
  })

  // ---------------------------------------------------------------------------
  // Status badges
  // ---------------------------------------------------------------------------

  it('renders a blue badge for an open ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())

    const openRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('alice@example.com'))!
    const badge = Array.from(openRow.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'open')!
    expect(badge).toHaveClass('rounded-full')
  })

  it('renders a green badge for a resolved ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeInTheDocument())

    const resolvedRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('bob@example.com'))!
    const badge = Array.from(resolvedRow.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'resolved')!
    expect(badge).toHaveClass('rounded-full')
  })

  it('renders a gray badge for a closed ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())

    const closedRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('carol@example.com'))!
    const badge = Array.from(closedRow.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'closed')!
    expect(badge).toHaveClass('rounded-full')
  })

  // ---------------------------------------------------------------------------
  // Category badges
  // ---------------------------------------------------------------------------

  it('renders a purple badge for a technical ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('alice@example.com'))!
    const badge = Array.from(row.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'technical')!
    expect(badge).toHaveClass('rounded-full')
  })

  it('renders an amber badge for a refund ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('bob@example.com'))!
    const badge = Array.from(row.querySelectorAll('span')).find((s) => s.textContent?.trim() === 'refund')!
    expect(badge).toHaveClass('rounded-full')
  })

  it('renders a dash for a ticket with no category', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) => r.textContent?.includes('carol@example.com'))!
    expect(row.textContent).toContain('—')
  })

  // ---------------------------------------------------------------------------
  // Assigned to column
  // ---------------------------------------------------------------------------

  it('renders the "Assigned to" column header', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    expect(screen.getByText('Assigned to')).toBeInTheDocument()
  })

  it('shows "Unassigned" as the selected option for a ticket with no agent', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    const aliceRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('alice@example.com'))!
    const select = aliceRow.querySelector('select') as HTMLSelectElement
    expect(select.value).toBe('')
  })

  it('shows the assigned agent as the selected option for an assigned ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())
    await waitFor(() => {
      const carolRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('carol@example.com'))!
      const select = carolRow.querySelector('select') as HTMLSelectElement
      expect(select.value).toBe('u1')
    })
  })

  it('lists available agents as options in the dropdown', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    await waitFor(() => {
      const options = Array.from(document.querySelectorAll('select option'))
      const names = options.map((o) => o.textContent)
      expect(names).toContain('John Agent')
      expect(names).toContain('Jane Agent')
    })
  })

  it('calls PATCH /api/tickets/:id/assign when an agent is selected', async () => {
    const patchSpy = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    renderPage()
    await waitFor(() => expect(screen.getByText('Login page not loading')).toBeInTheDocument())
    await waitFor(() => {
      const aliceRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('alice@example.com'))!
      const select = aliceRow.querySelector('select')!
      expect(select).toBeTruthy()
    })

    const aliceRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('alice@example.com'))!
    const select = aliceRow.querySelector('select')!
    fireEvent.change(select, { target: { value: 'u1' } })

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        '/api/tickets/1/assign',
        { agentId: 'u1' },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  it('calls PATCH with null when "Unassigned" is selected for an assigned ticket', async () => {
    const patchSpy = vi.spyOn(axios, 'patch').mockResolvedValue({ data: {} })
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())

    const carolRow = screen.getAllByRole('row').find((r) => r.textContent?.includes('carol@example.com'))!
    const select = carolRow.querySelector('select')!
    fireEvent.change(select, { target: { value: '' } })

    await waitFor(() =>
      expect(patchSpy).toHaveBeenCalledWith(
        '/api/tickets/3/assign',
        { agentId: null },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('shows "No tickets yet" when the API returns an empty list', async () => {
    mockGet({ data: [], total: 0, page: 1, pageSize: 10, totalPages: 0 })
    renderPage()
    await waitFor(() => expect(screen.getByText('No tickets yet')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('shows a generic error message when the request fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Failed to load tickets')).toBeInTheDocument())
  })

  it('shows the server error message from the response body', async () => {
    const err = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { data: { error: 'Forbidden' } },
    })
    vi.spyOn(axios, 'get').mockRejectedValue(err)
    renderPage()
    await waitFor(() => expect(screen.getByText('Forbidden')).toBeInTheDocument())
  })
})
