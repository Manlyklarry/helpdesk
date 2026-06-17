import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import type { TicketNotification } from '../hooks/useNotifications'

type Props = {
  notifications: TicketNotification[]
  unread: number
  onOpen: () => void
  onRequestPermission: () => void
}

export function NotificationBell({ notifications, unread, onOpen, onRequestPermission }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleToggle = () => {
    const next = !open
    setOpen(next)
    if (next) onOpen()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer',
          open
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        )}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold text-white leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-card shadow-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-foreground">Notifications</span>
            {Notification.permission === 'default' && (
              <button
                onClick={onRequestPermission}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Enable desktop alerts
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No new tickets yet
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={`${n.id}-${n.receivedAt}`}
                  onClick={() => {
                    navigate(`/tickets/${n.id}`)
                    setOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-accent transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium text-foreground truncate">{n.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">From {n.fromName}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(n.receivedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
