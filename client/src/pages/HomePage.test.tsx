import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import axios from 'axios'
import { HomePage } from './HomePage'

// Recharts ResponsiveContainer uses ResizeObserver which is absent in jsdom
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({
      data: { user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' } },
      isPending: false,
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}))

const MOCK_STATS = {
  totalTickets: 120,
  openTickets: 45,
  processingTickets: 3,
  resolvedTickets: 72,
  aiResolvedTickets: 15,
  aiResolutionRate: 21,
  avgResolutionTimeMs: 7_200_000, // 2 hours exactly
}

const MOCK_CHART = Array.from({ length: 30 }, (_, i) => ({
  date: `2026-05-${String(i + 1).padStart(2, '0')}`,
  count: (i % 6) + 1,
}))

function mockGet(stats = MOCK_STATS, chart = MOCK_CHART) {
  vi.spyOn(axios, 'get').mockImplementation((url: unknown) => {
    if ((url as string).includes('tickets-per-day')) return Promise.resolve({ data: chart })
    return Promise.resolve({ data: stats })
  })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <HomePage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => mockGet())
  afterEach(() => vi.restoreAllMocks())

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  it('shows skeleton elements while stats are loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  it('does not render any stat values while loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByText('120')).not.toBeInTheDocument()
    expect(screen.queryByText('45')).not.toBeInTheDocument()
    expect(screen.queryByText('21%')).not.toBeInTheDocument()
  })

  it('hides the chart title while chart data is loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(screen.queryByText('Ticket volume — last 30 days')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Stats cards — values
  // ---------------------------------------------------------------------------

  it('renders the Total Tickets card with the correct value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument())
    expect(screen.getByText('Total Tickets')).toBeInTheDocument()
  })

  it('renders the Open Tickets card with the correct value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('45')).toBeInTheDocument())
    expect(screen.getByText('Open Tickets')).toBeInTheDocument()
  })

  it('renders the Processing card with the correct value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('renders the Resolved Tickets card with the correct value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('72')).toBeInTheDocument())
    expect(screen.getByText('Resolved Tickets')).toBeInTheDocument()
  })

  it('renders the AI Resolved card with the correct value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('15')).toBeInTheDocument())
    expect(screen.getByText('AI Resolved')).toBeInTheDocument()
  })

  it('renders the AI Resolution Rate as a percentage', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('21%')).toBeInTheDocument())
    expect(screen.getByText('AI Resolution Rate')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Duration formatting
  // ---------------------------------------------------------------------------

  it('formats avgResolutionTimeMs as hours when exactly divisible', async () => {
    renderPage()
    // 7_200_000 ms = 2 hours
    await waitFor(() => expect(screen.getByText('2h')).toBeInTheDocument())
  })

  it('formats avgResolutionTimeMs with minutes remainder', async () => {
    mockGet({ ...MOCK_STATS, avgResolutionTimeMs: 5_400_000 }) // 1h 30m
    renderPage()
    await waitFor(() => expect(screen.getByText('1h 30m')).toBeInTheDocument())
  })

  it('formats avgResolutionTimeMs as minutes when under one hour', async () => {
    mockGet({ ...MOCK_STATS, avgResolutionTimeMs: 2_700_000 }) // 45 minutes
    renderPage()
    await waitFor(() => expect(screen.getByText('45m')).toBeInTheDocument())
  })

  it('formats avgResolutionTimeMs as days and hours', async () => {
    mockGet({ ...MOCK_STATS, avgResolutionTimeMs: 90_000_000 }) // 25 hours → 1d 1h
    renderPage()
    await waitFor(() => expect(screen.getByText('1d 1h')).toBeInTheDocument())
  })

  it('formats avgResolutionTimeMs as whole days when no remainder', async () => {
    mockGet({ ...MOCK_STATS, avgResolutionTimeMs: 172_800_000 }) // 48 hours → 2d
    renderPage()
    await waitFor(() => expect(screen.getByText('2d')).toBeInTheDocument())
  })

  it('shows — when avgResolutionTimeMs is null', async () => {
    mockGet({ ...MOCK_STATS, avgResolutionTimeMs: null })
    renderPage()
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
    expect(screen.getByText('No resolved tickets yet')).toBeInTheDocument()
  })

  it('shows "From open to resolved" description when avgResolutionTimeMs has a value', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('From open to resolved')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Chart
  // ---------------------------------------------------------------------------

  it('shows the chart title after data loads', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Ticket volume — last 30 days')).toBeInTheDocument(),
    )
  })

  it('shows skeleton bars while chart data is loading', () => {
    vi.spyOn(axios, 'get').mockReturnValue(new Promise(() => {}))
    renderPage()
    // Skeleton bars are rendered by TicketsChartSkeleton
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Error states
  // ---------------------------------------------------------------------------

  it('shows a generic error message when the stats request fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument(),
    )
  })

  it('shows the server error message from the response body', async () => {
    const err = Object.assign(new Error('Server Error'), {
      isAxiosError: true,
      response: { data: { error: 'Service unavailable' } },
    })
    vi.spyOn(axios, 'get').mockRejectedValue(err)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Service unavailable')).toBeInTheDocument(),
    )
  })

  it('shows a chart error message when only the chart request fails', async () => {
    vi.spyOn(axios, 'get').mockImplementation((url: unknown) => {
      if ((url as string).includes('tickets-per-day'))
        return Promise.reject(new Error('Chart fetch failed'))
      return Promise.resolve({ data: MOCK_STATS })
    })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Failed to load chart data')).toBeInTheDocument(),
    )
    // Stats still render
    expect(screen.getByText('120')).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Refresh button
  // ---------------------------------------------------------------------------

  it('renders the Refresh button', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('120')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument()
  })
})
