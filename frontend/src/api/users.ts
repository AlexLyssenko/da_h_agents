import apiClient from './client'

export interface UserSummary {
  id: string
  username: string
}

export const usersApi = {
  search: (q: string): Promise<UserSummary[]> =>
    apiClient
      .get<{ users: UserSummary[] }>('/api/users/search', { params: { q } })
      .then((r) => r.data.users),
}
