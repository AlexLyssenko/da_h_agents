import clsx from 'clsx'

interface AvatarProps {
  username: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const colors = [
  'bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-red-600',
  'bg-yellow-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600',
]

function colorFromUsername(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ username, size = 'md', className }: AvatarProps) {
  const color = colorFromUsername(username)
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold text-white select-none shrink-0',
        color,
        sizeClasses[size],
        className
      )}
      title={username}
    >
      {username[0]?.toUpperCase()}
    </div>
  )
}
