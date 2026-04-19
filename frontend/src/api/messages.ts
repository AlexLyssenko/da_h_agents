import apiClient from './client'

export interface Attachment {
  id: string
  filename: string
  mimeType: string
  size: number
  comment?: string
}

export interface Message {
  id: string
  roomId?: string
  dialogId?: string
  authorId: string
  content?: string
  replyToId?: string
  replyTo?: Message
  editedAt?: string
  deletedAt?: string
  createdAt: string
  author: {
    id: string
    username: string
  }
  attachments: Attachment[]
}

export interface MessagesPage {
  messages: Message[]
  nextCursor?: string
}

export interface Conversation {
  dialogId: string
  userId: string
  username: string
  lastMessage: string | null
  lastMessageAt: string | null
}

export const messagesApi = {
  getConversations: (): Promise<Conversation[]> =>
    apiClient
      .get<{ conversations: Conversation[] }>('/api/messages/conversations')
      .then((r) => r.data.conversations),

  getRoomMessages: (roomId: string, cursor?: string, limit = 50) =>
    apiClient
      .get<MessagesPage>(`/api/rooms/${roomId}/messages`, { params: { cursor, limit } })
      .then((r) => r.data),

  getDialogMessages: (dialogId: string, cursor?: string, limit = 50) =>
    apiClient
      .get<MessagesPage>(`/api/dialogs/${dialogId}/messages`, { params: { cursor, limit } })
      .then((r) => r.data),

  edit: (id: string, content: string) =>
    apiClient.put<Message>(`/api/messages/${id}`, { content }).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/api/messages/${id}`).then((r) => r.data),
}
