import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type User = {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent'
  createdAt: string
}

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<User[]>('/api/users', { withCredentials: true })
  return res.data
}

function RoleBadge({ role }: { role: 'admin' | 'agent' }) {
  return (
    <span
      className={
        role === 'admin'
          ? 'inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10'
          : 'inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10'
      }
    >
      {role}
    </span>
  )
}

export function UsersPage() {
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const errorMessage =
    axios.isAxiosError(error) && error.response?.data?.error
      ? String(error.response.data.error)
      : error
        ? 'Failed to load users'
        : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-2xl font-semibold text-gray-900 mb-6">Users</h1>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  <tr>
                    {['Name', 'Email', 'Role', 'Joined'].map((col) => (
                      <th key={col} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-44" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {errorMessage && (
              <p className="px-6 py-8 text-sm text-destructive">{errorMessage}</p>
            )}
            {!isLoading && !errorMessage && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <RoleBadge role={user.role} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
