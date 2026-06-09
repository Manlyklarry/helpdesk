import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { authClient } from './lib/auth-client'
import { Skeleton } from '@/components/ui/skeleton'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { UsersPage } from './pages/UsersPage'
import { TicketsPage } from './pages/TicketsPage'
import { TicketDetailPage } from './pages/TicketDetailPage'

function ProtectedRoute({
  children,
  adminOnly = false,
}: {
  children: React.ReactNode
  adminOnly?: boolean
}) {
  const { data: session, isPending, error } = authClient.useSession()

  if (isPending || error) {
    return (
      <div className="flex min-h-screen bg-background">
        <div className="w-[240px] shrink-0 bg-sidebar border-r border-sidebar-border" />
        <main className="flex-1 px-8 py-10">
          <Skeleton className="h-6 w-40 mb-6" />
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </main>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  if (adminOnly && session.user.role !== 'admin') return <Navigate to="/" replace />

  return <Layout>{children}</Layout>
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
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <ProtectedRoute>
              <TicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
