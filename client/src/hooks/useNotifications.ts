import { useEffect, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export type TicketNotification = {
  id: number
  subject: string
  fromName: string
  receivedAt: string
}

const MAX_NOTIFICATIONS = 20

export function useNotifications() {
  const [notifications, setNotifications] = useState<TicketNotification[]>([])
  const [unread, setUnread] = useState(0)
  const queryClient = useQueryClient()

  // Stable ref so the SSE effect closure doesn't need addNotification as a dep
  const addRef = useRef<(n: TicketNotification) => void>(null!)

  const addNotification = useCallback(
    (n: TicketNotification) => {
      setNotifications((prev) => [n, ...prev].slice(0, MAX_NOTIFICATIONS))
      setUnread((prev) => prev + 1)
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

  const markAllRead = useCallback(() => setUnread(0), [])

  const requestPermission = useCallback(async () => {
    if (Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }, [])

  return { notifications, unread, markAllRead, requestPermission }
}
