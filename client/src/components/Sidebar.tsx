import { Link, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Inbox,
  Users,
  LogOut,
  Sun,
  Moon,
  X,
} from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { useTheme } from '../contexts/theme'
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
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

function FooterButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType
  label: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150"
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span>{label}</span>
    </button>
  )
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const { isDark, toggle: toggleTheme } = useTheme()

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
        'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-sidebar border-r border-sidebar-border shadow-2xl',
        'transition-transform duration-200 ease-in-out',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Brand + close */}
      <div className="flex h-[60px] shrink-0 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Inbox className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Helpdesk
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {NAV.map(({ to, icon, label }) => (
          <NavItem key={to} to={to} icon={icon} label={label} active={isActive(to)} />
        ))}
        {session?.user.role === 'admin' && (
          <NavItem to="/users" icon={Users} label="Users" active={isActive('/users')} />
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-sidebar-border px-3 py-3 space-y-0.5">
        <FooterButton
          icon={isDark ? Sun : Moon}
          label={isDark ? 'Light mode' : 'Dark mode'}
          onClick={toggleTheme}
        />
        <FooterButton icon={LogOut} label="Sign out" onClick={handleSignOut} />

        {session && (
          <div className="flex items-center gap-3 px-3 py-2 mt-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {session.user.name}
              </p>
              <p className="truncate text-[11px] text-muted-foreground">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
