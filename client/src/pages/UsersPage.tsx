import { useState } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, UserPlus } from 'lucide-react'
import { axiosError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { User } from '@/types/user'
import { CreateUserModal } from './users/CreateUserModal'
import { EditUserModal } from './users/EditUserModal'
import { DeleteConfirmModal } from './users/DeleteConfirmModal'

async function fetchUsers(): Promise<User[]> {
  const res = await axios.get<User[]>('/api/users', { withCredentials: true })
  return res.data
}

function RoleBadge({ role }: { role: 'admin' | 'agent' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        role === 'admin'
          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
      )}
    >
      {role}
    </span>
  )
}

const TABLE_COLS = ['Name', 'Email', 'Role', 'Joined', '']

export function UsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  })

  const errorMessage = error ? axiosError(error, 'Failed to load users') : null

  return (
    <>
      <main className="mx-auto max-w-7xl px-6 lg:px-8 py-10 fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Users</h1>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
          >
            <UserPlus className="h-4 w-4" />
            Create user
          </Button>
        </div>

        <div className="rounded-xl bg-card border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <p className="text-sm font-semibold text-foreground">All users</p>
          </div>

          {isLoading && (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {TABLE_COLS.map((col, i) => (
                    <th
                      key={i}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-8 rounded-lg" />
                    </td>
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
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {TABLE_COLS.map((col, i) => (
                    <th
                      key={i}
                      className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-muted-foreground text-sm"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{user.name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditUser(user)}
                            aria-label={`Edit ${user.name}`}
                            className="text-muted-foreground hover:text-foreground hover:bg-accent"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          {user.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUser(user)}
                              aria-label={`Delete ${user.name}`}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      <CreateUserModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false)
          queryClient.invalidateQueries({ queryKey: ['users'] })
        }}
      />
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onUpdated={() => {
            setEditUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}
      {deleteUser && (
        <DeleteConfirmModal
          user={deleteUser}
          onClose={() => setDeleteUser(null)}
          onDeleted={() => {
            setDeleteUser(null)
            queryClient.invalidateQueries({ queryKey: ['users'] })
          }}
        />
      )}
    </>
  )
}
