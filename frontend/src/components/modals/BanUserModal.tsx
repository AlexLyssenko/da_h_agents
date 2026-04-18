import { useMutation } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import { ConfirmDialog } from './ConfirmDialog'

interface BanUserModalProps {
  roomId: string
  userId: string
  username: string
  onClose: () => void
  onSuccess: () => void
}

export function BanUserModal({ roomId, userId, username, onClose, onSuccess }: BanUserModalProps) {
  const banMutation = useMutation({
    mutationFn: () => roomsApi.removeMember(roomId, userId),
    onSuccess: () => { onSuccess(); onClose() },
  })

  return (
    <ConfirmDialog
      title={`Ban ${username}`}
      message={`Are you sure you want to ban ${username} from this room? They will not be able to rejoin.`}
      confirmLabel="Ban User"
      dangerous
      onConfirm={() => banMutation.mutate()}
      onCancel={onClose}
    />
  )
}
