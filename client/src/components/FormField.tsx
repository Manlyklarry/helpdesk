import { Label } from '@/components/ui/label'

export function FormField({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: React.ReactNode
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
