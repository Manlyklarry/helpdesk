import { Link, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Inbox,
  Users,
  LogOut,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { useTheme } from '../contexts/theme'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tickets', icon: Inbox, label: 'Tickets' },
]

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-full ml-2.5 z-50 rounded-md bg-zinc-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 dark:bg-zinc-100 dark:text-zinc-900">
      {label}
    </span>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  to: string
  icon: React.ElementType
  label: string
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      to={to}
      className={cn(
        'group relative flex items-center rounded-lg text-sm font-medium transition-colors duration-150',
        collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
        active
          ? 'bg-primary/10 text-primary dark:bg-primary/20'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
      )}
    >
      {active && (
        <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-primary" />
      )}
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
      {collapsed && <Tooltip label={label} />}
    </Link>
  )
}

function FooterButton({
  icon: Icon,
  label,
  collapsed,
  onClick,
  tooltip,
}: {
  icon: React.ElementType
  label: string
  collapsed: boolean
  onClick?: () => void
  tooltip?: string
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-150',
        collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5',
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {!collapsed && <span>{label}</span>}
      {collapsed && <Tooltip label={tooltip ?? label} />}
    </button>
  )
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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
        'fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border',
        'transition-[width] duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-[60px]' : 'w-[240px]',
      )}
    >
      {/* Brand */}
      <div
        className={cn(
          'flex h-[60px] shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-0' : 'gap-2.5 px-4',
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Inbox className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Helpdesk
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex-1 py-3 space-y-0.5 overflow-y-auto overflow-x-visible',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {NAV.map(({ to, icon, label }) => (
          <NavItem
            key={to}
            to={to}
            icon={icon}
            label={label}
            active={isActive(to)}
            collapsed={collapsed}
          />
        ))}
        {session?.user.role === 'admin' && (
          <NavItem
            to="/users"
            icon={Users}
            label="Users"
            active={isActive('/users')}
            collapsed={collapsed}
          />
        )}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          'shrink-0 border-t border-sidebar-border py-3 space-y-0.5',
          collapsed ? 'px-2' : 'px-3',
        )}
      >
        {/* Theme toggle */}
        <FooterButton
          icon={isDark ? Sun : Moon}
          label={isDark ? 'Light mode' : 'Dark mode'}
          collapsed={collapsed}
          onClick={toggleTheme}
        />

        {/* Collapse toggle */}
        <FooterButton
          icon={collapsed ? ChevronRight : ChevronLeft}
          label="Collapse"
          tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          collapsed={collapsed}
          onClick={onToggle}
        />

        {/* Sign out */}
        <FooterButton
          icon={LogOut}
          label="Sign out"
          collapsed={collapsed}
          onClick={handleSignOut}
        />

        {/* User */}
        {session && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-lg mt-1',
              collapsed ? 'justify-center p-3' : 'px-3 py-2',
            )}
          >
            <div className="group relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
              {collapsed && <Tooltip label={session.user.name} />}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {session.user.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
