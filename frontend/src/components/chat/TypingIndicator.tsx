import { useTyping } from '../../hooks/useTyping'

interface TypingIndicatorProps {
  roomId?: string
  dialogId?: string
}

export function TypingIndicator({ roomId, dialogId }: TypingIndicatorProps) {
  const { typingUserIds } = useTyping(roomId, dialogId)

  if (typingUserIds.length === 0) return null

  const label =
    typingUserIds.length === 1
      ? `${typingUserIds[0]} is typing`
      : typingUserIds.length === 2
      ? `${typingUserIds[0]} and ${typingUserIds[1]} are typing`
      : 'Several people are typing'

  return (
    <div className="flex items-center gap-1.5 px-4 py-1 text-xs text-[var(--text-muted)]">
      <span>{label}</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 bg-current rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  )
}
