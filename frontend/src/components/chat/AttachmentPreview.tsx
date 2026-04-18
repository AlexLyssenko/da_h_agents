import { useState } from 'react'
import type { Attachment } from '../../api/messages'
import { attachmentsApi } from '../../api/attachments'
import { formatFileSize } from '../../utils/fileSize'

interface AttachmentPreviewProps {
  attachment: Attachment
  uploadProgress?: number
}

export function AttachmentPreview({ attachment, uploadProgress }: AttachmentPreviewProps) {
  const [lightbox, setLightbox] = useState(false)
  const isImage = attachment.mimeType.startsWith('image/')
  const url = attachmentsApi.getDownloadUrl(attachment.id)

  if (isImage) {
    return (
      <>
        <div className="relative inline-block">
          <img
            src={url}
            alt={attachment.filename}
            className="max-w-[300px] max-h-48 rounded-md cursor-pointer object-cover border border-[var(--border)]"
            onClick={() => setLightbox(true)}
          />
          {uploadProgress !== undefined && uploadProgress < 100 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-[var(--bg-secondary)] rounded-b-md">
              <div
                className="h-full bg-blue-500 rounded-b-md transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
            onClick={() => setLightbox(false)}
          >
            <img src={url} alt={attachment.filename} className="max-w-full max-h-full object-contain" />
            <button
              className="absolute top-4 right-4 text-white text-2xl"
              onClick={() => setLightbox(false)}
              aria-label="Close lightbox"
            >
              ✕
            </button>
          </div>
        )}
      </>
    )
  }

  return (
    <a
      href={url}
      download={attachment.filename}
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-blue-500 transition-colors text-sm max-w-xs"
    >
      <span className="text-xl">📎</span>
      <div className="min-w-0">
        <div className="font-medium text-[var(--text-primary)] truncate">{attachment.filename}</div>
        <div className="text-xs text-[var(--text-muted)]">{formatFileSize(attachment.size)}</div>
      </div>
      {uploadProgress !== undefined && uploadProgress < 100 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" style={{ width: `${uploadProgress}%` }} />
      )}
    </a>
  )
}
