import apiClient from './client'

export interface Room {
  id: string
  name: string
  description?: string
  isPublic: boolean
  ownerId: string
  createdAt: string
  memberCount?: number
  _count?: { members: number }
}

export interface RoomMember {
  id: string        // RoomMember record ID
  userId: string    // User's actual ID (use this for presence/comparisons)
  username: string
  isAdmin: boolean
  joinedAt: string
  presence?: 'ONLINE' | 'AFK' | 'OFFLINE'
}

export interface RoomBan {
  id: string
  userId: string
  bannedBy: string
  createdAt: string
  user: { id: string; username: string }
}

export const roomsApi = {
  list: (search?: string) =>
    apiClient
      .get<{ rooms: Room[] }>('/api/rooms', { params: { search } })
      .then((r) => r.data.rooms),

  create: (data: { name: string; description?: string; isPublic: boolean }) =>
    apiClient.post<{ room: Room }>('/api/rooms', data).then((r) => r.data.room),

  get: (id: string) =>
    apiClient.get<{ room: Room }>(`/api/rooms/${id}`).then((r) => r.data.room),

  update: (id: string, data: Partial<{ name: string; description: string; isPublic: boolean }>) =>
    apiClient.put<{ room: Room }>(`/api/rooms/${id}`, data).then((r) => r.data.room),

  delete: (id: string) => apiClient.delete(`/api/rooms/${id}`),

  join: (id: string) => apiClient.post(`/api/rooms/${id}/join`).then((r) => r.data),

  leave: (id: string) => apiClient.post(`/api/rooms/${id}/leave`).then((r) => r.data),

  invite: (id: string, userId: string) =>
    apiClient.post(`/api/rooms/${id}/invite`, { userId }).then((r) => r.data),

  getMembers: (id: string) =>
    apiClient
      .get<{ members: RoomMember[] }>(`/api/rooms/${id}/members`)
      .then((r) => r.data.members),

  removeMember: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/members/${userId}`).then((r) => r.data),

  getBans: (id: string) =>
    apiClient
      .get<{ bans: RoomBan[] }>(`/api/rooms/${id}/bans`)
      .then((r) => r.data.bans),

  unban: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/bans/${userId}`).then((r) => r.data),

  promoteAdmin: (roomId: string, userId: string) =>
    apiClient.post(`/api/rooms/${roomId}/admins/${userId}`).then((r) => r.data),

  demoteAdmin: (roomId: string, userId: string) =>
    apiClient.delete(`/api/rooms/${roomId}/admins/${userId}`).then((r) => r.data),

  getMyRooms: () =>
    apiClient.get<{ rooms: Room[] }>('/api/rooms/me').then((r) => r.data.rooms),
}
