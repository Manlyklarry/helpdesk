import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type TicketNotification = {
  id: number
  subject: string
  fromName: string
  receivedAt: string
}

const MAX_NOTIFICATIONS = 20
const STORAGE_KEY = 'helpdesk:notifications'

type StoredState = {
  notifications: TicketNotification[]
  unread: number
}

function loadFromStorage(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as StoredState
  } catch {}
  return { notifications: [], unread: 0 }
}

function saveToStorage(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function useNotifications() {
  const initial = loadFromStorage()
  const [notifications, setNotifications] = useState<TicketNotification[]>(initial.notifications)
  const [unread, setUnread] = useState(initial.unread)
  const queryClient = useQueryClient()

  // Stable ref so the SSE effect closure doesn't need addNotification as a dep
  const addRef = useRef<(n: TicketNotification) => void>(null!)

  const addNotification = useCallback(
    (n: TicketNotification) => {
      setNotifications((prev) => {
        const next = [n, ...prev].slice(0, MAX_NOTIFICATIONS)
        setUnread((u) => {
          const nextUnread = u + 1
          saveToStorage({ notifications: next, unread: nextUnread })
          return nextUnread
        })
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      if (Notification.permission === 'granted') {
        new Notification(`New ticket from ${n.fromName}`, {
          body: n.subject,
          icon: '/favicon.ico',
          tag: `ticket-${n.id}`,
        })
      }
    },
    [queryClient],
  )

  addRef.current = addNotification

  useEffect(() => {
    const es = new EventSource('/api/events', { withCredentials: true })

    es.addEventListener('new-ticket', (e: MessageEvent) => {
      const data = JSON.parse(e.data) as { id: number; subject: string; fromName: string }
      addRef.current({ ...data, receivedAt: new Date().toISOString() })
    })

    return () => es.close()
  }, [])

  const markAllRead = useCallback(() => {
    setUnread(0)
    setNotifications((prev) => {
      saveToStorage({ notifications: prev, unread: 0 })
      return prev
    })
  }, [])

  const requestPermission = useCallback(async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return { notifications, unread, markAllRead, requestPermission }
}
