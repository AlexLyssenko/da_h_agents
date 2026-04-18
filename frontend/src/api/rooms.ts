import apiClient from './client'

export interface Room {
  id: string
  name: string
  description?: string
  isPublic: boolean
  ownerId: string
  createdAt: string
  memberCount?: number
}

export interface RoomMember {
  id: string
  username: string
  email: string
  isAdmin: boolean
  joinedAt: string
  presence?: 'ONLINE' | 'AFK' | 'OFFLINE'
}

export interface RoomBan {
  userId: string
  username: string
  bannedBy: string
  createdAt: string
}

export const roomsApi = {
  list: (search?: string) =>
    apiClient.get<Room[]>('/api/rooms', { params: { q: search } }).then((r) => r.data),

  create: (data: { name: string; description?: string; isPublic: boolean }) =>
    apiClient.post<Room>('/api/rooms', data).then((r) => r.data),

  get: (id: string) => apiClient.get<Room>(`/api/rooms/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<{ name: string; description: string; isPublic: boolean }>) =>
    apiClient.put<Room>(`/api/rooms/${id}`, data).then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/api/rooms/${id}`).then((r) => r.data),

  join: (id: string) => apiClient.post(`/api/rooms/${id}/join`).then((r) => r.data),

  leave: (id: string) => apiClient.post(`/api/rooms/${id}/leave`).then((r) => r.data),

  invite: (id: string, userId: string) =>
    apiClient.post(`/api/rooms/${id}/invite`, { userId }).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient.get<RoomMember[]>(`/api/rooms/${id}/members`).then((r) => r.data),

  removeMember: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/members/${userId}`).then((r) => r.data),

  getBans: (id: string) =>
    apiClient.get<RoomBan[]>(`/api/rooms/${id}/bans`).then((r) => r.data),

  unban: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/bans/${userId}`).then((r) => r.data),

  promoteAdmin: (roomId: string, userId: string) =>
    apiClient.post(`/api/rooms/${roomId}/admins/${userId}`).then((r) => r.data),

  demoteAdmin: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/admins/${userId}`).then((r) => r.data),

  getMyRooms: () =>
    apiClient.get<Room[]>('/api/rooms/me').then((r) => r.data),
}
