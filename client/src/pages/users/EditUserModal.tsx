import { useEffect } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { makeZodResolver } from '@/lib/form'
import { axiosError } from '@/lib/api'
import type { User } from '@/types/user'

const schema = z.object({
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

type FormValues = z.infer<typeof schema>

export function EditUserModal({
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
  } = useForm<FormValues>({
    resolver: makeZodResolver(schema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', role: 'agent', password: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const body: Record<string, unknown> = { name: data.name, email: data.email, role: data.role }
      if (data.password) body.password = data.password
      return axios.patch<User>(`/api/users/${user.id}`, body, { withCredentials: true })
    },
    onSuccess: () => {
      reset()
      onUpdated()
    },
    onError: (err) => {
      setError('root', { message: axiosError(err, 'Failed to update user') })
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
