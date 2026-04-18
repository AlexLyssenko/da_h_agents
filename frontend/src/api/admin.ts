import apiClient from './client'

export interface JabberConnection {
  jid: string
  resource: string
  ip: string
  connectedSince: string
  presence: string
}

export interface FederationRoute {
  fromDomain: string
  toDomain: string
  state: string
  establishedSince: string
}

export interface FederationStats {
  routes: FederationRoute[]
  messagesToday: number
  messagesTotal: number
}

export const adminApi = {
  getJabberConnections: () =>
    apiClient.get<JabberConnection[]>('/api/admin/jabber/connections').then((r) => r.data),

  getFederationStats: () =>
    apiClient.get<FederationStats>('/api/admin/jabber/federation').then((r) => r.data),
}
