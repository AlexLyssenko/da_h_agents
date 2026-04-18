interface BadgeProps {
  count: number
}

export function Badge({ count }: BadgeProps) {
  if (count <= 0) return null
  return (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold bg-blue-600 text-white rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  )
}
