import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import axios from 'axios'
import { UsersPage } from './UsersPage'

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: vi.fn().mockReturnValue({
      data: {
        user: { id: '1', name: 'Admin', email: 'admin@test.com', role: 'admin' },
      },
      isPending: false,
    }),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
}))

const MOCK_USERS = [
  {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@test.com',
    role: 'admin' as const,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Bob Agent',
    email: 'bob@test.com',
    role: 'agent' as const,
    createdAt: '2024-02-20T00:00:00.000Z',
  },
]

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <UsersPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('UsersPage', () => {
  beforeEach(() => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: MOCK_USERS })
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

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()

    expect(screen.queryByText('Alice Admin')).not.toBeInTheDocument()

    const skeletonCells = document.querySelectorAll('[data-slot="skeleton"]')
    expect(skeletonCells).toHaveLength(20) // 5 rows × 4 cells
  })

  // ---------------------------------------------------------------------------
  // Table content
  // ---------------------------------------------------------------------------

  it('renders a row for each user after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    expect(screen.getByText('Bob Agent')).toBeInTheDocument()
  })

  it('shows the email address for each user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('alice@test.com')).toBeInTheDocument())
    expect(screen.getByText('bob@test.com')).toBeInTheDocument()
  })

  it('formats the joined date with toLocaleDateString', async () => {
    renderPage()
    const expected = new Date('2024-01-15T00:00:00.000Z').toLocaleDateString()
    await waitFor(() => expect(screen.getByText(expected)).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Role badges
  // ---------------------------------------------------------------------------

  it('renders a purple badge for an admin user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    const adminRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('alice@test.com'),
    )!
    const badge = adminRow.querySelector('span')!
    expect(badge).toHaveTextContent('admin')
    expect(badge).toHaveClass('bg-purple-50')
  })

  it('renders a gray badge for an agent user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

    const agentRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('bob@test.com'),
    )!
    const badge = agentRow.querySelector('span')!
    expect(badge).toHaveTextContent('agent')
    expect(badge).toHaveClass('bg-gray-100')
  })

  // ---------------------------------------------------------------------------
  // Empty state
  // ---------------------------------------------------------------------------

  it('shows "No users found" when the API returns an empty list', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({ data: [] })
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('No users found')).toBeInTheDocument(),
    )
  })

  // ---------------------------------------------------------------------------
  // Error state
  // ---------------------------------------------------------------------------

  it('shows a generic error message when the request fails', async () => {
    vi.spyOn(axios, 'get').mockRejectedValue(new Error('Network Error'))
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Failed to load users')).toBeInTheDocument(),
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

  // ---------------------------------------------------------------------------
  // Create user button
  // ---------------------------------------------------------------------------

  it('renders a "Create user" button', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument()
  })

  it('opens the create user modal when the button is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('closes the modal when Cancel is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('heading', { name: 'Create user' })).not.toBeInTheDocument()
  })

  it('closes the modal when the backdrop is clicked', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument()

    // The backdrop is the first child of the modal container (absolute inset-0)
    const backdrop = document.querySelector('.fixed.inset-0 > .absolute.inset-0')!
    fireEvent.click(backdrop)
    expect(screen.queryByRole('heading', { name: 'Create user' })).not.toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    fireEvent.submit(document.querySelector('.fixed form')!)

    await waitFor(() =>
      expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument(),
    )
    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('submits the form and refreshes the user list on success', async () => {
    const newUser = {
      id: '3',
      name: 'Carol New',
      email: 'carol@test.com',
      role: 'agent' as const,
      createdAt: '2024-03-01T00:00:00.000Z',
    }
    vi.spyOn(axios, 'post').mockResolvedValue({ data: newUser })
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({ data: [...MOCK_USERS, newUser] })

    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Carol New' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carol@test.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepass' } })

    fireEvent.submit(document.querySelector('.fixed form')!)

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Create user' })).not.toBeInTheDocument(),
    )

    // query was invalidated → getSpy called again
    expect(getSpy).toHaveBeenCalledTimes(2)

    await waitFor(() => expect(screen.getByText('Carol New')).toBeInTheDocument())
  })

  it('shows a server error when the create request fails', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(
      Object.assign(new Error('Conflict'), {
        isAxiosError: true,
        response: { data: { error: 'A user with that email already exists' } },
      }),
    )

    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Alice Admin' } })
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepass' } })

    fireEvent.submit(document.querySelector('.fixed form')!)

    await waitFor(() =>
      expect(
        screen.getByText('A user with that email already exists'),
      ).toBeInTheDocument(),
    )
  })
})
