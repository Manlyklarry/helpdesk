import { useState, useEffect } from 'react'
import axios from 'axios'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Navbar } from '../components/Navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, Trash2 } from 'lucide-react'

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

// ---------------------------------------------------------------------------
// Create user
// ---------------------------------------------------------------------------

const createUserSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { error: 'Name is required' })
    .min(3, { error: 'Name must be at least 3 characters' }),
  email: z.string()
    .min(1, { error: 'Email is required' })
    .email({ error: 'Enter a valid email address' }),
  password: z.string()
    .min(1, { error: 'Password is required' })
    .min(8, { error: 'Password must be at least 8 characters' })
    .refine((v) => !/\s/.test(v), { message: 'Password must not contain spaces' }),
})

type CreateUserValues = z.infer<typeof createUserSchema>

const createUserResolver: Resolver<CreateUserValues> = async (values) => {
  const result = createUserSchema.safeParse(values)
  if (result.success) return { values: result.data, errors: {} }
  const errors: Record<string, { message: string; type: string }> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') as keyof CreateUserValues
    if (!errors[key]) errors[key] = { message: issue.message, type: issue.code }
  }
  return { values: {}, errors }
}

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<CreateUserValues>({
    resolver: createUserResolver,
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: (data: CreateUserValues) =>
      axios.post<User>('/api/users', data, { withCredentials: true }),
    onSuccess: () => {
      reset()
      onCreated()
    },
    onError: (err) => {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Failed to create user'
      setError('root', { message: msg })
    },
  })

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Create user</h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="new-name">Name</Label>
            <Input
              id="new-name"
              type="text"
              autoComplete="off"
              placeholder="Jane Smith"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-email">Email</Label>
            <Input
              id="new-email"
              type="email"
              autoComplete="off"
              placeholder="jane@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password">Password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating...
                </>
              ) : (
                'Create user'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit user
// ---------------------------------------------------------------------------

const editUserSchema = z.object({
  name: z.string()
    .trim()
    .min(1, { error: 'Name is required' })
    .min(3, { error: 'Name must be at least 3 characters' }),
  email: z.string()
    .min(1, { error: 'Email is required' })
    .email({ error: 'Enter a valid email address' }),
  role: z.enum(['admin', 'agent']),
  password: z.string()
    .refine((v) => v === '' || v.length >= 8, { message: 'Password must be at least 8 characters' })
    .refine((v) => v === '' || !/\s/.test(v), { message: 'Password must not contain spaces' }),
})

type EditUserValues = z.infer<typeof editUserSchema>

const editUserResolver: Resolver<EditUserValues> = async (values) => {
  const result = editUserSchema.safeParse(values)
  if (result.success) return { values: result.data, errors: {} }
  const errors: Record<string, { message: string; type: string }> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') as keyof EditUserValues
    if (!errors[key]) errors[key] = { message: issue.message, type: issue.code }
  }
  return { values: {}, errors }
}

function EditUserModal({
  user,
  onClose,
  onUpdated,
}: {
  user: User
  onClose: () => void
  onUpdated: () => void
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<EditUserValues>({
    resolver: editUserResolver,
    mode: 'onChange',
    defaultValues: { name: '', email: '', role: 'agent', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: EditUserValues) => {
      const body: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
      }
      if (data.password) body.password = data.password
      return axios.patch<User>(`/api/users/${user.id}`, body, { withCredentials: true })
    },
    onSuccess: () => {
      reset()
      onUpdated()
    },
    onError: (err) => {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Failed to update user'
      setError('root', { message: msg })
    },
  })

  useEffect(() => {
    reset({ name: user.name, email: user.email, role: user.role, password: '' })
  }, [user, reset])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Edit user</h2>
        <form
          onSubmit={handleSubmit((data) => mutation.mutate(data))}
          noValidate
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              type="text"
              autoComplete="off"
              placeholder="Jane Smith"
              aria-invalid={!!errors.name}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-email">Email</Label>
            <Input
              id="edit-email"
              type="email"
              autoComplete="off"
              placeholder="jane@example.com"
              aria-invalid={!!errors.email}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Role</Label>
            <select
              id="edit-role"
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors outline-none focus:border-ring focus:ring-3 focus:ring-ring/50"
              aria-invalid={!!errors.role}
              {...register('role')}
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
            {errors.role && (
              <p className="text-xs text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-password">
              Password
              <span className="ml-1 text-xs font-normal text-gray-400">(leave blank to keep current)</span>
            </Label>
            <Input
              id="edit-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={!!errors.password}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset()
                onClose()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Save changes'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Delete user
// ---------------------------------------------------------------------------

function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: User
  onClose: () => void
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      axios.delete(`/api/users/${user.id}`, { withCredentials: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onDeleted()
    },
    onError: (err) => {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.error
          ? String(err.response.data.error)
          : 'Failed to delete user'
      setServerError(msg)
    },
  })

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-base font-semibold text-gray-900">Delete user</h2>
        <p className="mb-6 text-sm text-gray-600">
          Are you sure you want to delete <span className="font-medium text-gray-900">{user.name}</span>? This action cannot be undone.
        </p>

        {serverError && (
          <p className="mb-4 text-sm text-destructive">{serverError}</p>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function UsersPage() {
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [deleteUser, setDeleteUser] = useState<User | null>(null)
  const queryClient = useQueryClient()

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
          <Button onClick={() => setShowModal(true)}>Create user</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading && (
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50/60">
                  <tr>
                    {['Name', 'Email', 'Role', 'Joined', ''].map((col, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
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
                      <td className="px-6 py-4"><Skeleton className="h-8 w-8 rounded-md" /></td>
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
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
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
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditUser(user)}
                              aria-label={`Edit ${user.name}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {user.role !== 'admin' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteUser(user)}
                                aria-label={`Delete ${user.name}`}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
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
          </CardContent>
        </Card>
      </main>

      <CreateUserModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={() => {
          setShowModal(false)
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
          onDeleted={() => setDeleteUser(null)}
        />
      )}
    </div>
  )
}
