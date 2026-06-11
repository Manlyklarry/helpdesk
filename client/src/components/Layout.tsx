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

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar — always visible on lg+, drawer on mobile */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Main content area shifted right on desktop */}
      <div className="flex flex-col min-h-screen lg:pl-[260px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            {/* Brand name — mobile only (sidebar shows it on desktop) */}
            <span className="text-[15px] font-semibold text-foreground lg:hidden">Helpdesk</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
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
