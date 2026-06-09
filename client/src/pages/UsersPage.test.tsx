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
    expect(skeletonCells).toHaveLength(25) // 5 rows × 5 cells (Name, Email, Role, Joined, Actions)
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
    expect(badge).toHaveClass('rounded-full')
  })

  it('renders a gray badge for an agent user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

    const agentRow = screen.getAllByRole('row').find((r) =>
      r.textContent?.includes('bob@test.com'),
    )!
    const badge = agentRow.querySelector('span')!
    expect(badge).toHaveTextContent('agent')
    expect(badge).toHaveClass('rounded-full')
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

  it('closes the modal when Escape is pressed', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(screen.queryByRole('heading', { name: 'Create user' })).not.toBeInTheDocument()
  })

  it('shows validation errors when submitting an empty form', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Create user' }))

    fireEvent.submit(document.querySelector('.fixed form')!)

    await waitFor(() =>
      expect(screen.getByText('Name is required')).toBeInTheDocument(),
    )
    expect(screen.getByText('Email is required')).toBeInTheDocument()
    expect(screen.getByText('Password is required')).toBeInTheDocument()
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

  // ---------------------------------------------------------------------------
  // Create user form — field-level validation
  // ---------------------------------------------------------------------------

  describe('Create user form', () => {
    async function openModal() {
      renderPage()
      await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument(),
      )
    }

    describe('name field', () => {
      it('shows "Name is required" for whitespace-only input', async () => {
        await openModal()
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: '   ' } })
        await waitFor(() =>
          expect(screen.getByText('Name is required')).toBeInTheDocument(),
        )
      })

      it('shows "Name must be at least 3 characters" for input shorter than 3 chars', async () => {
        await openModal()
        fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'ab' } })
        await waitFor(() =>
          expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument(),
        )
      })

      it('clears the name error once a valid name is entered', async () => {
        await openModal()
        const input = screen.getByLabelText('Name')
        fireEvent.change(input, { target: { value: 'ab' } })
        await waitFor(() =>
          expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument(),
        )
        fireEvent.change(input, { target: { value: 'Alice' } })
        await waitFor(() =>
          expect(screen.queryByText('Name must be at least 3 characters')).not.toBeInTheDocument(),
        )
      })
    })

    describe('email field', () => {
      it('shows "Email is required" when the field is cleared after typing', async () => {
        await openModal()
        const input = screen.getByLabelText('Email')
        fireEvent.change(input, { target: { value: 'a' } })
        fireEvent.change(input, { target: { value: '' } })
        await waitFor(() =>
          expect(screen.getByText('Email is required')).toBeInTheDocument(),
        )
      })

      it('shows "Enter a valid email address" for an invalid email format', async () => {
        await openModal()
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'notanemail' } })
        await waitFor(() =>
          expect(screen.getByText('Enter a valid email address')).toBeInTheDocument(),
        )
      })

      it('clears the email error once a valid email is entered', async () => {
        await openModal()
        const input = screen.getByLabelText('Email')
        fireEvent.change(input, { target: { value: 'bad' } })
        await waitFor(() =>
          expect(screen.getByText('Enter a valid email address')).toBeInTheDocument(),
        )
        fireEvent.change(input, { target: { value: 'user@example.com' } })
        await waitFor(() =>
          expect(screen.queryByText('Enter a valid email address')).not.toBeInTheDocument(),
        )
      })
    })

    describe('password field', () => {
      it('shows "Password is required" when the field is cleared after typing', async () => {
        await openModal()
        const input = screen.getByLabelText('Password')
        fireEvent.change(input, { target: { value: 'a' } })
        fireEvent.change(input, { target: { value: '' } })
        await waitFor(() =>
          expect(screen.getByText('Password is required')).toBeInTheDocument(),
        )
      })

      it('shows "Password must be at least 8 characters" for short input', async () => {
        await openModal()
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
        await waitFor(() =>
          expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument(),
        )
      })

      it('shows "Password must not contain spaces" when the password has a space', async () => {
        await openModal()
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass word1' } })
        await waitFor(() =>
          expect(screen.getByText('Password must not contain spaces')).toBeInTheDocument(),
        )
      })

      it('clears the password error once a valid password is entered', async () => {
        await openModal()
        const input = screen.getByLabelText('Password')
        fireEvent.change(input, { target: { value: 'short' } })
        await waitFor(() =>
          expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument(),
        )
        fireEvent.change(input, { target: { value: 'securepassword' } })
        await waitFor(() =>
          expect(
            screen.queryByText('Password must be at least 8 characters'),
          ).not.toBeInTheDocument(),
        )
      })
    })

    it('disables the submit button while the request is in flight', async () => {
      vi.spyOn(axios, 'post').mockReturnValue(new Promise(() => {}))
      await openModal()

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Carol New' } })
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'carol@test.com' } })
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'securepass' } })
      fireEvent.submit(document.querySelector('.fixed form')!)

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Creating...' })).toBeDisabled(),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Edit user
  // ---------------------------------------------------------------------------

  describe('Edit user', () => {
    async function openEditModal() {
      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
      fireEvent.click(screen.getByRole('button', { name: 'Edit Bob Agent' }))
      await waitFor(() =>
        expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument(),
      )
    }

    it('renders an edit button for every user row', async () => {
      renderPage()
      await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'Edit Alice Admin' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Edit Bob Agent' })).toBeInTheDocument()
    })

    it('opens the edit modal when the edit button is clicked', async () => {
      await openEditModal()
      expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Role')).toBeInTheDocument()
    })

    it("pre-populates the form with the selected user's data", async () => {
      await openEditModal()
      expect(screen.getByLabelText('Name')).toHaveValue('Bob Agent')
      expect(screen.getByLabelText('Email')).toHaveValue('bob@test.com')
      expect(screen.getByLabelText('Role')).toHaveValue('agent')
    })

    it('closes the modal when Cancel is clicked', async () => {
      await openEditModal()
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('heading', { name: 'Edit user' })).not.toBeInTheDocument()
    })

    it('closes the modal when the backdrop is clicked', async () => {
      await openEditModal()
      const backdrop = document.querySelector('.fixed.inset-0 > .absolute.inset-0')!
      fireEvent.click(backdrop)
      expect(screen.queryByRole('heading', { name: 'Edit user' })).not.toBeInTheDocument()
    })

    it('closes the modal when Escape is pressed', async () => {
      await openEditModal()
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(screen.queryByRole('heading', { name: 'Edit user' })).not.toBeInTheDocument()
    })

    it('submits the form and refreshes the list on success', async () => {
      const updated = { ...MOCK_USERS[1], name: 'Bob Updated' }
      vi.spyOn(axios, 'patch').mockResolvedValue({ data: updated })
      const getSpy = vi.spyOn(axios, 'get')
        .mockResolvedValueOnce({ data: MOCK_USERS })
        .mockResolvedValueOnce({ data: [MOCK_USERS[0], updated] })

      await openEditModal()

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bob Updated' } })
      fireEvent.submit(document.querySelector('.fixed form')!)

      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Edit user' })).not.toBeInTheDocument(),
      )
      expect(getSpy).toHaveBeenCalledTimes(2)
      await waitFor(() => expect(screen.getByText('Bob Updated')).toBeInTheDocument())
    })

    it('does not include password in the request when the password field is left blank', async () => {
      const patchSpy = vi.spyOn(axios, 'patch').mockResolvedValue({ data: MOCK_USERS[1] })

      await openEditModal()
      fireEvent.submit(document.querySelector('.fixed form')!)

      await waitFor(() => expect(patchSpy).toHaveBeenCalled())
      const body = patchSpy.mock.calls[0][1] as Record<string, unknown>
      expect(body).not.toHaveProperty('password')
    })

    it('shows a server error when the update request fails', async () => {
      vi.spyOn(axios, 'patch').mockRejectedValue(
        Object.assign(new Error('Conflict'), {
          isAxiosError: true,
          response: { data: { error: 'A user with that email already exists' } },
        }),
      )

      await openEditModal()
      fireEvent.submit(document.querySelector('.fixed form')!)

      await waitFor(() =>
        expect(screen.getByText('A user with that email already exists')).toBeInTheDocument(),
      )
    })

    it('disables the submit button while the request is in flight', async () => {
      vi.spyOn(axios, 'patch').mockReturnValue(new Promise(() => {}))

      await openEditModal()
      fireEvent.submit(document.querySelector('.fixed form')!)

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled(),
      )
    })
  })

  // ---------------------------------------------------------------------------
  // Delete user
  // ---------------------------------------------------------------------------

  describe('Delete user', () => {
    it('does not render a delete button for admin users', async () => {
      renderPage()
      await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
      expect(screen.queryByRole('button', { name: 'Delete Alice Admin' })).not.toBeInTheDocument()
    })

    it('renders a delete button for agent users', async () => {
      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'Delete Bob Agent' })).toBeInTheDocument()
    })

    it('opens the confirmation modal when the delete button is clicked', async () => {
      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))

      expect(screen.getByRole('heading', { name: 'Delete user' })).toBeInTheDocument()
      // confirmation paragraph contains the user name (appears in both table and modal)
      expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument()
      expect(screen.getAllByText('Bob Agent').length).toBeGreaterThan(1)
    })

    it('closes the modal when Cancel is clicked without calling delete', async () => {
      const deleteSpy = vi.spyOn(axios, 'delete')
      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
      expect(screen.getByRole('heading', { name: 'Delete user' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByRole('heading', { name: 'Delete user' })).not.toBeInTheDocument()
      expect(deleteSpy).not.toHaveBeenCalled()
    })

    it('closes the modal when Escape is pressed without calling delete', async () => {
      const deleteSpy = vi.spyOn(axios, 'delete')
      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
      expect(screen.getByRole('heading', { name: 'Delete user' })).toBeInTheDocument()

      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
      expect(screen.queryByRole('heading', { name: 'Delete user' })).not.toBeInTheDocument()
      expect(deleteSpy).not.toHaveBeenCalled()
    })

    it('calls delete API and refreshes list on confirmation', async () => {
      vi.spyOn(axios, 'delete').mockResolvedValue({ data: { success: true } })
      // First call: initial load (both users); second call: after invalidation (only Alice)
      const getSpy = vi.spyOn(axios, 'get')
        .mockResolvedValueOnce({ data: MOCK_USERS })
        .mockResolvedValueOnce({ data: [MOCK_USERS[0]] })

      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() =>
        expect(screen.queryByRole('heading', { name: 'Delete user' })).not.toBeInTheDocument(),
      )

      expect(getSpy).toHaveBeenCalledTimes(2)
    })

    it('shows a server error when the delete request fails', async () => {
      vi.spyOn(axios, 'delete').mockRejectedValue(
        Object.assign(new Error('Forbidden'), {
          isAxiosError: true,
          response: { data: { error: 'Admin users cannot be deleted' } },
        }),
      )

      renderPage()
      await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())

      fireEvent.click(screen.getByRole('button', { name: 'Delete Bob Agent' }))
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() =>
        expect(screen.getByText('Admin users cannot be deleted')).toBeInTheDocument(),
      )
    })
  })
})
