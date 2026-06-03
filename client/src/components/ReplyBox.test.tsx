import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import { ReplyBox } from './ReplyBox'

function renderReplyBox(ticketId = 1) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <ReplyBox ticketId={ticketId} />
    </QueryClientProvider>,
  )
}

describe('ReplyBox', () => {
  afterEach(() => vi.restoreAllMocks())

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders the reply label', () => {
    renderReplyBox()
    expect(screen.getByText('Reply')).toBeInTheDocument()
  })

  it('renders the textarea with the correct placeholder', () => {
    renderReplyBox()
    expect(screen.getByPlaceholderText('Type your reply…')).toBeInTheDocument()
  })

  it('renders the send button', () => {
    renderReplyBox()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Disabled / enabled states
  // ---------------------------------------------------------------------------

  it('disables the send button when the textarea is empty', () => {
    renderReplyBox()
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('keeps the button disabled when the textarea contains only whitespace', () => {
    renderReplyBox()
    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: '   ' },
    })
    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled()
  })

  it('enables the send button once non-whitespace text is typed', () => {
    renderReplyBox()
    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Hello there.' },
    })
    expect(screen.getByRole('button', { name: 'Send reply' })).not.toBeDisabled()
  })

  // ---------------------------------------------------------------------------
  // Pending / in-flight state
  // ---------------------------------------------------------------------------

  it('shows "Sending…" on the button while the request is in-flight', async () => {
    vi.spyOn(axios, 'post').mockReturnValue(new Promise(() => {}))
    renderReplyBox()

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Hello there.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sending…' })).toBeInTheDocument(),
    )
  })

  it('disables the button while the request is in-flight', async () => {
    vi.spyOn(axios, 'post').mockReturnValue(new Promise(() => {}))
    renderReplyBox()

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Hello there.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled(),
    )
  })

  // ---------------------------------------------------------------------------
  // POST request
  // ---------------------------------------------------------------------------

  it('POSTs to /api/tickets/:id/messages with the typed body', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 1 } })
    renderReplyBox(42)

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'My detailed reply.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(postSpy).toHaveBeenCalledWith(
        '/api/tickets/42/messages',
        { body: 'My detailed reply.' },
        expect.objectContaining({ withCredentials: true }),
      ),
    )
  })

  // ---------------------------------------------------------------------------
  // Success behaviour
  // ---------------------------------------------------------------------------

  it('clears the textarea after a successful send', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 1 } })
    renderReplyBox()

    const textarea = screen.getByPlaceholderText('Type your reply…') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'Hello there.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() => expect(textarea.value).toBe(''))
  })

  it('restores the "Send reply" label after a successful send', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({ data: { id: 1 } })
    renderReplyBox()

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'Hello there.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send reply' })).toBeInTheDocument(),
    )
  })

  // ---------------------------------------------------------------------------
  // Error behaviour
  // ---------------------------------------------------------------------------

  it('shows the server error message on failure', async () => {
    const err = Object.assign(new Error('Bad Request'), {
      isAxiosError: true,
      response: { data: { error: 'Reply cannot be empty' } },
    })
    vi.spyOn(axios, 'post').mockRejectedValue(err)
    renderReplyBox()

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(screen.getByText('Reply cannot be empty')).toBeInTheDocument(),
    )
  })

  it('shows a generic fallback error when the server provides no message', async () => {
    vi.spyOn(axios, 'post').mockRejectedValue(new Error('Network Error'))
    renderReplyBox()

    fireEvent.change(screen.getByPlaceholderText('Type your reply…'), {
      target: { value: 'test' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))

    await waitFor(() =>
      expect(screen.getByText('Failed to send reply')).toBeInTheDocument(),
    )
  })

  it('clears the error message after a subsequent successful send', async () => {
    const postSpy = vi.spyOn(axios, 'post')
    const err = Object.assign(new Error('Server Error'), {
      isAxiosError: true,
      response: { data: { error: 'Something went wrong' } },
    })
    postSpy.mockRejectedValueOnce(err)
    postSpy.mockResolvedValueOnce({ data: { id: 1 } })

    renderReplyBox()
    const textarea = screen.getByPlaceholderText('Type your reply…')

    // First send fails — error appears
    fireEvent.change(textarea, { target: { value: 'First attempt.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    await waitFor(() =>
      expect(screen.getByText('Something went wrong')).toBeInTheDocument(),
    )

    // Second send succeeds — error disappears
    fireEvent.change(textarea, { target: { value: 'Second attempt.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }))
    await waitFor(() =>
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument(),
    )
  })
})
