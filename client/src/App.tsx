import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { authClient } from './lib/auth-client'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { UsersPage } from './pages/UsersPage'

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const { data: session, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <span className="text-sm text-gray-500">Loading…</span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (adminOnly && session.user.role !== 'admin') return <Navigate to="/" replace />

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
