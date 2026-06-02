import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2 } from 'lucide-react'
import { makeZodResolver } from '@/lib/form'
import { axiosError } from '@/lib/api'
import { Modal } from '@/components/Modal'
import { FormField } from '@/components/FormField'
import type { User } from '@/types/user'

const schema = z.object({
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

type FormValues = z.infer<typeof schema>

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
  } = useForm<FormValues>({
    resolver: makeZodResolver(schema),
    mode: 'onChange',
  })

  const mutation = useMutation({
    mutationFn: (data: FormValues) =>
      axios.post<User>('/api/users', data, { withCredentials: true }),
    onSuccess: () => {
      reset()
      onCreated()
    },
    onError: (err) => {
      setError('root', { message: axiosError(err, 'Failed to create user') })
    },
  })

  if (!open) return null

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-4 text-base font-semibold text-gray-900">Create user</h2>
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        noValidate
        className="space-y-4"
      >
        <FormField id="new-name" label="Name" error={errors.name?.message}>
          <Input
            id="new-name"
            type="text"
            autoComplete="off"
            placeholder="Jane Smith"
            aria-invalid={!!errors.name}
            {...register('name')}
          />
        </FormField>

        <FormField id="new-email" label="Email" error={errors.email?.message}>
          <Input
            id="new-email"
            type="email"
            autoComplete="off"
            placeholder="jane@example.com"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>

        <FormField id="new-password" label="Password" error={errors.password?.message}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
        </FormField>

        {errors.root && (
          <p className="text-sm text-destructive">{errors.root.message}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <><Loader2 className="animate-spin" />Creating...</> : 'Create user'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
