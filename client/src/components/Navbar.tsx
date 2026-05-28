import { useNavigate, Link } from 'react-router'
import { authClient } from '../lib/auth-client'

export function Navbar() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await authClient.signOut()
    navigate('/login')
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-lg font-semibold text-gray-900">Helpdesk</Link>
            {session?.user.role === 'admin' && (
              <Link to="/users" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                Users
              </Link>
            )}
          </div>

          {session && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {session.user.name}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
