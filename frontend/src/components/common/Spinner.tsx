import clsx from 'clsx'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div
      className={clsx(
        'border-2 border-t-transparent border-blue-500 rounded-full animate-spin',
        sizeClasses[size],
        className
      )}
    />
  )
}
