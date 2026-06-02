import { useEffect, useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { axiosError } from '@/lib/api'
import type { User } from '@/types/user'

export function DeleteConfirmModal({
  user,
  onClose,
  onDeleted,
}: {
  user: User
  onClose: () => void
  onDeleted: () => void
}) {
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      axios.delete(`/api/users/${user.id}`, { withCredentials: true }),
    onSuccess: () => onDeleted(),
    onError: (err) => setServerError(axiosError(err, 'Failed to delete user')),
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
          Are you sure you want to delete{' '}
          <span className="font-medium text-gray-900">{user.name}</span>? This action cannot be undone.
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
