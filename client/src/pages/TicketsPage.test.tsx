import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  },
]

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
  beforeEach(() => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: MOCK_TICKETS })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows skeleton rows while data is loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()

    expect(screen.getByText('Subject')).toBeInTheDocument()
    expect(screen.queryByText('Login page not loading')).not.toBeInTheDocument()

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons).toHaveLength(25) // 5 rows × 5 cols
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

  // ---------------------------------------------------------------------------
  // Status badges
  // ---------------------------------------------------------------------------

  it('renders a blue badge for an open ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())

    const openRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('alice@example.com'),
    )!
    const badge = Array.from(openRow.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'open',
    )!
    expect(badge).toHaveClass('bg-blue-50')
  })

  it('renders a green badge for a resolved ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeInTheDocument())

    const resolvedRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('bob@example.com'),
    )!
    const badge = Array.from(resolvedRow.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'resolved',
    )!
    expect(badge).toHaveClass('bg-green-50')
  })

  it('renders a gray badge for a closed ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())

    const closedRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('carol@example.com'),
    )!
    const badge = Array.from(closedRow.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'closed',
    )!
    expect(badge).toHaveClass('bg-gray-100')
  })

  // ---------------------------------------------------------------------------
  // Category badges
  // ---------------------------------------------------------------------------

  it('renders a purple badge for a technical ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Johnson')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('alice@example.com'),
    )!
    const badge = Array.from(row.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'technical',
    )!
    expect(badge).toHaveClass('bg-purple-50')
  })

  it('renders an amber badge for a refund ticket', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Smith')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('bob@example.com'),
    )!
    const badge = Array.from(row.querySelectorAll('span')).find(
      (s) => s.textContent?.trim() === 'refund',
    )!
    expect(badge).toHaveClass('bg-amber-50')
  })

  it('renders a dash for a ticket with no category', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Carol Williams')).toBeInTheDocument())

    const row = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('carol@example.com'),
    )!
    expect(row.textContent).toContain('—')
  })

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('shows "No tickets yet" when the API returns an empty list', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No tickets yet')).toBeInTheDocument(),
    )
  })

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('shows a generic error message when the request fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Failed to load tickets')).toBeInTheDocument(),
    )
  })

  it('shows the server error message from the response body', async () => {
    const err = Object.assign(new Error('Forbidden'), {
      isAxiosError: true,
      response: { data: { error: 'Forbidden' } },
    })
    vi.spyOn(axios, 'get').mockRejectedValue(err)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Forbidden')).toBeInTheDocument(),
    )
  })
})
