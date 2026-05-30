import { useEffect } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { Resolver } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import type { User } from '@/types/user'

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

export function CreateUserModal({
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
