import clsx from 'clsx'

type Status = 'ONLINE' | 'AFK' | 'OFFLINE'

interface PresenceDotProps {
  status: Status
  className?: string
}

const statusColor: Record<Status, string> = {
  ONLINE: 'bg-green-500',
  AFK: 'bg-yellow-500',
  OFFLINE: 'bg-gray-500',
}

export function PresenceDot({ status, className }: PresenceDotProps) {
  return (
    <span
      className={clsx(
        'inline-block w-2.5 h-2.5 rounded-full shrink-0',
        statusColor[status],
        className
      )}
      title={status}
    />
  )
}
