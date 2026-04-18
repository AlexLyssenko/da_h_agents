import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { messagesApi } from '../../api/messages'
import type { Message } from '../../api/messages'
import { ReplyPreview } from './ReplyPreview'
import { AttachmentPreview } from './AttachmentPreview'
import { Avatar } from '../common/Avatar'
import { ConfirmDialog } from '../modals/ConfirmDialog'
import { formatRelative, formatFull, formatTime } from '../../utils/formatDate'
import { getSocket } from '../../api/socket'
import clsx from 'clsx'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  isCompact: boolean
  isAdmin: boolean
  onReply: (message: Message) => void
  onScrollTo?: (messageId: string) => void
}

export function MessageBubble({ message, isOwn, isCompact, isAdmin, onReply, onScrollTo }: MessageBubbleProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content ?? '')
  const [showDelete, setShowDelete] = useState(false)
  const editMutation = useMutation({
    mutationFn: (content: string) => messagesApi.edit(message.id, content),
    onSuccess: () => {
      setIsEditing(false)
      getSocket()?.emit('message:edit', { messageId: message.id, content: editContent })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => messagesApi.delete(message.id),
    onSuccess: () => {
      getSocket()?.emit('message:delete', { messageId: message.id })
    },
  })

  if (message.deletedAt) {
    return (
      <div className="px-4 py-0.5 italic text-[var(--text-muted)] text-sm">
        [Message deleted]
      </div>
    )
  }

  return (
    <>
      <div
        className={clsx(
          'group flex items-start gap-3 px-4 py-0.5 hover:bg-white/5 rounded-md transition-colors',
          isCompact ? 'py-0.5' : 'py-2'
        )}
      >
        <div className="w-8 shrink-0">
          {!isCompact && <Avatar username={message.author.username} size="sm" />}
        </div>

        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                {message.author.username}
              </span>
              <span
                className="text-xs text-[var(--text-muted)] cursor-default"
                title={formatFull(message.createdAt)}
              >
                {formatRelative(message.createdAt)}
              </span>
            </div>
          )}

          {message.replyTo && (
            <ReplyPreview
              replyTo={message.replyTo}
              onClick={() => onScrollTo?.(message.replyToId!)}
            />
          )}

          {isEditing ? (
            <div className="flex gap-2 mt-1">
              <input
                autoFocus
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    editMutation.mutate(editContent)
                  }
                  if (e.key === 'Escape') setIsEditing(false)
                }}
                className="flex-1 px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
              />
              <button onClick={() => editMutation.mutate(editContent)}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                Save
              </button>
              <button onClick={() => setIsEditing(false)}
                className="px-2 py-1 text-xs bg-[var(--bg-secondary)] text-[var(--text-muted)] rounded hover:bg-[var(--border)]">
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
              {message.content}
              {message.editedAt && (
                <span className="ml-2 text-xs text-[var(--text-muted)]">(edited)</span>
              )}
            </div>
          )}

          {message.attachments?.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((att) => (
                <AttachmentPreview key={att.id} attachment={att} />
              ))}
            </div>
          )}
        </div>

        {/* Hover action toolbar */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
          <button
            onClick={() => onReply(message)}
            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded"
            title="Reply"
            aria-label="Reply"
          >
            ↩
          </button>
          {isOwn && (
            <button
              onClick={() => { setIsEditing(true); setEditContent(message.content ?? '') }}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded"
              title="Edit"
              aria-label="Edit message"
            >
              ✏️
            </button>
          )}
          {(isOwn || isAdmin) && (
            <button
              onClick={() => setShowDelete(true)}
              className="p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-[var(--bg-secondary)] rounded"
              title="Delete"
              aria-label="Delete message"
            >
              🗑️
            </button>
          )}
        </div>

        {/* Compact timestamp on right when hovering */}
        {isCompact && (
          <span
            className="opacity-0 group-hover:opacity-100 text-xs text-[var(--text-muted)] shrink-0 w-10 text-right"
            title={formatFull(message.createdAt)}
          >
            {formatTime(message.createdAt)}
          </span>
        )}
      </div>

      {showDelete && (
        <ConfirmDialog
          title="Delete Message"
          message="Are you sure you want to delete this message? This cannot be undone."
          confirmLabel="Delete"
          dangerous
          onConfirm={() => { deleteMutation.mutate(); setShowDelete(false) }}
          onCancel={() => setShowDelete(false)}
        />
      )}
    </>
  )
}
