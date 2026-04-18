interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 text-center">
      {icon && <span className="text-5xl">{icon}</span>}
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
