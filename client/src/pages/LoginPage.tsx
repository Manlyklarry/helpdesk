import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { Inbox } from 'lucide-react'
import { authClient } from '../lib/auth-client'
import { makeZodResolver } from '../lib/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/FormField'

const schema = z.object({
  email: z.string().email('Enter a valid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: makeZodResolver(schema),
    mode: 'onTouched',
  })

  const onSubmit = async (data: FormValues) => {
    const { error } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
    })
    if (error) setError('root', { message: error.message ?? 'Invalid email or password.' })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-6 py-12">
      <div className="w-full max-w-sm fade-in">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Inbox className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">Helpdesk</span>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <h1 className="text-xl font-semibold text-foreground mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground mb-7">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <FormField id="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
            </FormField>

            <FormField id="password" label="Password" error={errors.password?.message}>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                aria-invalid={!!errors.password}
                {...register('password')}
              />
            </FormField>

            {errors.root && (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Helpdesk
        </p>
      </div>
    </div>
  )
}
