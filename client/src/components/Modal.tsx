import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export function Modal({
  onClose,
  maxWidth = 'max-w-md',
  children,
}: {
  onClose: () => void
  maxWidth?: string
  children: React.ReactNode
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative z-10 w-full rounded-xl bg-card border border-border p-6 shadow-xl', maxWidth)}>
        {children}
      </div>
    </div>
  )
}
