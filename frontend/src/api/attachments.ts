import apiClient from './client'
import type { Attachment } from './messages'

export const attachmentsApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient
      .post<Attachment>('/api/attachments', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total))
          }
        },
      })
      .then((r) => r.data)
  },

  getDownloadUrl: (id: string) =>
    `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/attachments/${id}`,
}
