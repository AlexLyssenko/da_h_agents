import apiClient from './client'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  sessionId: string
  user: { id: string; username: string; email: string }
}

export const authApi = {
  login: (data: LoginPayload) =>
    apiClient.post<AuthResponse>('/api/auth/login', data).then((r) => r.data),

  register: (data: RegisterPayload) =>
    apiClient.post<AuthResponse>('/api/auth/register', data).then((r) => r.data),

  logout: () => apiClient.post('/api/auth/logout').then((r) => r.data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/api/auth/refresh').then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/api/auth/password', data).then((r) => r.data),

  deleteAccount: (data: { password: string }) =>
    apiClient.delete('/api/auth/account', { data }).then((r) => r.data),
}
