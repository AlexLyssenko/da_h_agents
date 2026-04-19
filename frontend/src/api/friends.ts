import apiClient from './client'

// Shape returned by GET /api/friends for accepted friends
export interface AcceptedFriend {
  friendshipId: string
  friend: { id: string; username: string }
  presence?: string
}

// Shape returned by GET /api/friends for incoming pending requests
export interface PendingIncoming {
  friendshipId: string
  from: { id: string; username: string }
  createdAt: string
}

// Shape returned by GET /api/friends for outgoing pending requests
export interface PendingOutgoing {
  friendshipId: string
  to: { id: string; username: string }
  createdAt: string
}

// Full friendship record returned by POST /request and PUT /:id/accept
export interface Friendship {
  id: string
  requesterId: string
  recipientId: string
  status: 'PENDING' | 'ACCEPTED'
  createdAt: string
  requester: { id: string; username: string }
  recipient: { id: string; username: string }
}

export interface FriendsResponse {
  accepted: AcceptedFriend[]
  pendingIncoming: PendingIncoming[]
  pendingOutgoing: PendingOutgoing[]
}

export interface BannedUser {
  userId: string
  username: string
  bannedAt: string
}

export interface BanStatus {
  isBannedByMe: boolean
  isBannedByThem: boolean
}

export const friendsApi = {
  list: (): Promise<FriendsResponse> =>
    apiClient.get<FriendsResponse>('/api/friends').then((r) => r.data),

  sendRequest: (username: string, message?: string): Promise<Friendship> =>
    apiClient
      .post<{ friendship: Friendship }>('/api/friends/request', { username, message })
      .then((r) => r.data.friendship),

  accept: (id: string): Promise<Friendship> =>
    apiClient
      .put<{ friendship: Friendship }>(`/api/friends/${id}/accept`)
      .then((r) => r.data.friendship),

  remove: (id: string): Promise<void> =>
    apiClient.delete(`/api/friends/${id}`).then(() => undefined),

  listBanned: (): Promise<BannedUser[]> =>
    apiClient.get<{ banned: BannedUser[] }>('/api/friends/ban').then((r) => r.data.banned),

  checkBan: (userId: string): Promise<BanStatus> =>
    apiClient.get<BanStatus>(`/api/friends/ban/check/${userId}`).then((r) => r.data),

  ban: (userId: string): Promise<void> =>
    apiClient.post('/api/friends/ban', { userId }).then(() => undefined),

  unban: (userId: string): Promise<void> =>
    apiClient.delete(`/api/friends/ban/${userId}`).then(() => undefined),
}
