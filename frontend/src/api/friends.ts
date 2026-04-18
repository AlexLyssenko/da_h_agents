import apiClient from './client'

export interface Friend {
  id: string
  username: string
  email: string
  presence?: 'ONLINE' | 'AFK' | 'OFFLINE'
}

export interface FriendRequest {
  id: string
  requesterId: string
  recipientId: string
  status: 'PENDING' | 'ACCEPTED'
  createdAt: string
  requester: Friend
  recipient: Friend
}

export interface FriendsResponse {
  friends: FriendRequest[]
  pendingIncoming: FriendRequest[]
  pendingOutgoing: FriendRequest[]
}

export const friendsApi = {
  list: () => apiClient.get<FriendsResponse>('/api/friends').then((r) => r.data),

  sendRequest: (username: string, message?: string) =>
    apiClient.post<FriendRequest>('/api/friends/request', { username, message }).then((r) => r.data),

  accept: (id: string) =>
    apiClient.put<FriendRequest>(`/api/friends/${id}/accept`).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/api/friends/${id}`).then((r) => r.data),

  ban: (userId: string) =>
    apiClient.post('/api/friends/ban', { userId }).then((r) => r.data),

  unban: (userId: string) =>
    apiClient.delete(`/api/friends/ban/${userId}`).then((r) => r.data),
}
