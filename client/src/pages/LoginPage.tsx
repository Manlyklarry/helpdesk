import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useNavigate } from 'react-router'
import { Inbox, Zap, Brain, Mail } from 'lucide-react'
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

const FEATURES = [
  {
    icon: Mail,
    title: 'Email-to-ticket automation',
    desc: 'Every support email becomes a tracked ticket instantly.',
  },
  {
    icon: Brain,
    title: 'AI-powered replies',
    desc: 'Claude drafts context-aware responses for your agents.',
  },
  {
    icon: Zap,
    title: 'Auto-resolve common issues',
    desc: 'Routine questions get resolved without agent involvement.',
  },
]

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
    <div className="min-h-screen flex">
      {/* ── Left panel — brand & features ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between bg-[#0f172a] px-10 py-12 relative overflow-hidden">
        {/* Background grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Glow blob */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-80 w-80 rounded-full bg-indigo-600/15 blur-3xl" />

        {/* Brand */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-500/30">
            <Inbox className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight">Helpdesk</span>
            <p className="text-[11px] text-blue-400/80 leading-none mt-0.5">AI-powered support</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative space-y-6">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Resolve tickets faster
              <br />
              with the power of AI
            </h2>
            <p className="mt-3 text-[15px] text-slate-400 leading-relaxed">
              Your team's intelligent support hub — from email ingestion to AI-assisted resolution.
            </p>
          </div>

          <div className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/8 border border-white/10">
                  <Icon className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-slate-600">
          © {new Date().getFullYear()} Helpdesk. All rights reserved.
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex flex-1 items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-[380px] fade-in">
          {/* Mobile brand */}
          <div className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Inbox className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Helpdesk</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Sign in to your account to continue</p>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-sm p-7">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <FormField id="email" label="Email address" error={errors.email?.message}>
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
                <div className="rounded-lg bg-destructive/8 border border-destructive/20 px-3 py-2.5">
                  <p className="text-sm text-destructive">{errors.root.message}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-10 shadow-sm cursor-pointer"
              >
                {isSubmitting ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
