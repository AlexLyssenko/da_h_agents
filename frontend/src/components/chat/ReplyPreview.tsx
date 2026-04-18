import type { Message } from '../../api/messages'

interface ReplyPreviewProps {
  replyTo: Message
  onClick?: () => void
}

export function ReplyPreview({ replyTo, onClick }: ReplyPreviewProps) {
  const text = replyTo.content
    ? replyTo.content.slice(0, 100)
    : replyTo.attachments?.length
    ? '[attachment]'
    : '[deleted]'

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-2 px-3 py-1.5 rounded-md bg-[var(--bg-primary)] border-l-2 border-blue-400 mb-1 ${
        onClick ? 'cursor-pointer hover:bg-[var(--bg-secondary)]' : ''
      }`}
    >
      <div className="min-w-0">
        <span className="font-mono text-xs text-blue-400 font-semibold">
          {replyTo.author?.username ?? 'Unknown'}
        </span>
        <p className="text-xs text-[var(--text-muted)] truncate">{text}</p>
      </div>
    </div>
  )
}
