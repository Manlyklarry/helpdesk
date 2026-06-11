import { Link, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Inbox,
  Users,
  LogOut,
  X,
} from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Inbox, label: 'Tickets' },
]

function NavItem({
  to,
  icon: Icon,
  label,
  active,
}: {
  to: string
  icon: React.ElementType
  label: string
  active: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
      )}
    >
      <Icon className="h-[17px] w-[17px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)

  const handleSignOut = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate('/login')
  }

  const initials = session?.user.name
    ? session.user.name
        .split(' ')
        .map((n: string) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-sidebar border-r border-sidebar-border',
        // Desktop: always visible
        'lg:translate-x-0',
        // Mobile: drawer
        'transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Inbox className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-[14px] font-bold tracking-tight text-sidebar-foreground">
              Helpdesk
            </span>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Support portal</p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors lg:hidden cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Main
        </p>
        {NAV.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} active={isActive(to)} />
        ))}
        {session?.user.role === 'admin' && (
          <>
            <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Admin
            </p>
            <NavItem to="/users" icon={Users} label="Users" active={isActive('/users')} />
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="shrink-0 border-t border-sidebar-border p-3">
        {session && (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-sidebar-accent transition-colors group">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-sidebar-foreground">
                {session.user.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session.user.email}
              </p>
            </div>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="opacity-0 group-hover:opacity-100 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-destructive transition-all cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
