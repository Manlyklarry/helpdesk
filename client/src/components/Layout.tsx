import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { Menu, Sun, Moon } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useTheme } from '../contexts/theme'
import { cn } from '@/lib/utils'

export function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const { isDark, toggle: toggleTheme } = useTheme()

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  // Close sidebar on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/50 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar drawer */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Page shell */}
      <div className="flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-[15px] font-semibold text-foreground">Helpdesk</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
