import { useState } from 'react'
import axios from 'axios'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { axiosError } from '@/lib/api'
import { Modal } from '@/components/Modal'
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
    mutationFn: () => axios.delete(`/api/users/${user.id}`, { withCredentials: true }),
    onSuccess: () => onDeleted(),
    onError: (err) => setServerError(axiosError(err, 'Failed to delete user')),
  })

  return (
    <Modal onClose={onClose} maxWidth="max-w-sm">
      <h2 className="mb-2 text-base font-semibold text-foreground">Delete user</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Are you sure you want to delete{' '}
        <span className="font-medium text-foreground">{user.name}</span>? This action cannot be undone.
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
          {mutation.isPending ? <><Loader2 className="animate-spin" />Deleting...</> : 'Delete'}
        </Button>
      </div>
    </Modal>
  )
}
