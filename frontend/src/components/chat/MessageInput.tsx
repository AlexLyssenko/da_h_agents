import { useState, useRef, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import type { Message } from '../../api/messages'
import { attachmentsApi } from '../../api/attachments'
import { getSocket } from '../../api/socket'
import { EmojiPicker } from './EmojiPicker'
import { ReplyPreview } from './ReplyPreview'
import clsx from 'clsx'

const MAX_CONTENT_BYTES = 3072
const CHAR_WARN_THRESHOLD = 0.8

interface PendingAttachment {
  file: File
  id?: string
  progress: number
  error?: string
}

interface MessageInputProps {
  roomId?: string
  dialogId?: string
  replyTo?: Message | null
  onCancelReply?: () => void
  disabled?: boolean
  disabledMessage?: string
  onSend: (content: string, attachmentIds: string[], replyToId?: string) => void
}

export function MessageInput({
  roomId,
  dialogId,
  replyTo,
  onCancelReply,
  disabled = false,
  disabledMessage,
  onSend,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isTypingRef = useRef(false)

  const contentBytes = new TextEncoder().encode(content).length
  const showCounter = contentBytes > MAX_CONTENT_BYTES * CHAR_WARN_THRESHOLD

  const sendTypingStart = () => {
    if (!isTypingRef.current) {
      isTypingRef.current = true
      getSocket()?.emit('typing:start', { roomId, dialogId })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      getSocket()?.emit('typing:stop', { roomId, dialogId })
    }, 3000)
  }

  const sendTypingStop = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false
      getSocket()?.emit('typing:stop', { roomId, dialogId })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
  }

  const adjustTextarea = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 24
    const maxLines = 6
    el.style.height = `${Math.min(el.scrollHeight, lineHeight * maxLines)}px`
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    adjustTextarea()
    if (e.target.value) sendTypingStart()
    else sendTypingStop()
  }

  const uploadFile = async (file: File): Promise<string | undefined> => {
    const placeholder: PendingAttachment = { file, progress: 0 }
    setPendingAttachments((prev) => [...prev, placeholder])

    try {
      const attachment = await attachmentsApi.upload(file, (progress) => {
        setPendingAttachments((prev) =>
          prev.map((p) => (p.file === file ? { ...p, progress } : p))
        )
      })
      setPendingAttachments((prev) =>
        prev.map((p) => (p.file === file ? { ...p, id: attachment.id, progress: 100 } : p))
      )
      return attachment.id
    } catch {
      setPendingAttachments((prev) =>
        prev.map((p) => (p.file === file ? { ...p, error: 'Upload failed' } : p))
      )
    }
  }

  const onDrop = useCallback((files: File[]) => {
    files.forEach((file) => uploadFile(file))
  }, [])

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
  })

  // Paste to attach images
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          e.preventDefault()
          uploadFile(file)
        }
      }
    }
  }

  const handleSend = () => {
    const trimmed = content.trim()
    const uploadedIds = pendingAttachments
      .filter((p) => p.id && p.progress === 100)
      .map((p) => p.id!)

    if (!trimmed && !uploadedIds.length) return
    if (contentBytes > MAX_CONTENT_BYTES) return

    onSend(trimmed, uploadedIds, replyTo?.id)
    setContent('')
    setPendingAttachments([])
    onCancelReply?.()
    sendTypingStop()
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const insertEmoji = (emoji: string) => {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = content.slice(0, start) + emoji + content.slice(end)
    setContent(next)
    requestAnimationFrame(() => {
      el.setSelectionRange(start + emoji.length, start + emoji.length)
      el.focus()
    })
  }

  if (disabled) {
    return (
      <div className="px-4 py-3 bg-[var(--bg-secondary)] border-t border-[var(--border)]">
        <p className="text-sm text-[var(--text-muted)] text-center">{disabledMessage ?? 'You cannot send messages here.'}</p>
      </div>
    )
  }

  return (
    <div
      {...getRootProps()}
      className={clsx(
        'px-4 py-2 bg-[var(--bg-secondary)] border-t border-[var(--border)]',
        isDragActive && 'ring-2 ring-blue-500 ring-inset'
      )}
    >
      <input {...getInputProps()} />

      {isDragActive && (
        <div className="text-center text-sm text-blue-400 py-2">Drop files to attach</div>
      )}

      {replyTo && onCancelReply && (
        <div className="flex items-center gap-2 mb-1">
          <ReplyPreview replyTo={replyTo} />
          <button
            onClick={onCancelReply}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] ml-auto shrink-0"
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingAttachments.map((pa, i) => (
            <div key={i} className="flex items-center gap-1 px-2 py-1 bg-[var(--bg-surface)] rounded-md text-xs text-[var(--text-muted)]">
              <span className="truncate max-w-[120px]">{pa.file.name}</span>
              {pa.progress < 100 && !pa.error && (
                <span className="text-blue-400">{pa.progress}%</span>
              )}
              {pa.error && <span className="text-red-400">!</span>}
              <button
                onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="text-[var(--text-muted)] hover:text-red-400"
                aria-label="Remove attachment"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2">
        <button
          type="button"
          onClick={openFileDialog}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          aria-label="Attach file"
        >
          📎
        </button>

        <div className="relative flex-1">
          {showEmoji && (
            <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
          )}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={sendTypingStop}
            onPaste={handlePaste}
            placeholder={roomId ? 'Message...' : 'Direct message...'}
            rows={1}
            style={{ resize: 'none', minHeight: '40px' }}
            className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border)] rounded-md text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500 overflow-y-auto"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          aria-label="Emoji picker"
        >
          😊
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={!content.trim() && pendingAttachments.filter((p) => p.id).length === 0}
          className="p-1.5 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          aria-label="Send message"
        >
          ➤
        </button>
      </div>

      {showCounter && (
        <div className={clsx(
          'text-xs text-right mt-0.5',
          contentBytes > MAX_CONTENT_BYTES ? 'text-red-400' : 'text-[var(--text-muted)]'
        )}>
          {contentBytes}/{MAX_CONTENT_BYTES}
        </div>
      )}
    </div>
  )
}
