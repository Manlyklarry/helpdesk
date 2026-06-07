import { useNavigate, Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '../lib/auth-client'
import { Button } from '@/components/ui/button'

export function Navbar() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSignOut = async () => {
    await authClient.signOut()
    queryClient.clear()
    navigate('/login')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-gray-900">Helpdesk</Link>
            <Link to="/tickets" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Tickets
            </Link>
            {session?.user.role === 'admin' && (
              <Link to="/users" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Users
              </Link>
            )}
          </div>

          {session && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{session.user.name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
