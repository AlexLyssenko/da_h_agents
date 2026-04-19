import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import type { JabberConnection, FederationStats } from '../api/admin'
import { roomsApi } from '../api/rooms'
import type { Room } from '../api/rooms'
import { messagesApi } from '../api/messages'
import type { Message } from '../api/messages'
import { Spinner } from '../components/common/Spinner'
import { formatRelative } from '../utils/formatDate'
import toast from 'react-hot-toast'

function JabberDashboard() {
  const { data, isLoading } = useQuery<JabberConnection[]>({
    queryKey: ['admin', 'jabber', 'connections'],
    queryFn: adminApi.getJabberConnections,
    refetchInterval: 5000,
  })

  const online = data?.filter((c) => c.presence === 'ONLINE').length ?? 0
  const afk = data?.filter((c) => c.presence === 'AFK').length ?? 0

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Jabber Connections</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total', value: data?.length ?? 0 },
          { label: 'Online', value: online },
          { label: 'AFK', value: afk },
        ].map((stat) => (
          <div key={stat.label} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['JID', 'Resource', 'IP', 'Connected', 'Presence'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((conn, i) => (
                <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                  <td className="py-2 px-3 font-mono text-[var(--text-primary)]">{conn.jid}</td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{conn.resource}</td>
                  <td className="py-2 px-3 font-mono text-[var(--text-muted)]">{conn.ip}</td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{formatRelative(conn.connectedSince)}</td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium ${conn.presence === 'ONLINE' ? 'text-green-400' : 'text-yellow-400'}`}>
                      {conn.presence}
                    </span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-[var(--text-muted)]">No active connections</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FederationStatsPanel() {
  const { data, isLoading, refetch } = useQuery<FederationStats>({
    queryKey: ['admin', 'jabber', 'federation'],
    queryFn: adminApi.getFederationStats,
    refetchInterval: 5000,
  })

  const maxMessages = Math.max(data?.messagesToday ?? 0, data?.messagesTotal ?? 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Federation Traffic</h2>
        <button onClick={() => refetch()}
          className="px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] rounded-md hover:text-[var(--text-primary)] transition-colors">
          Refresh
        </button>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Messages Today', value: data.messagesToday },
              { label: 'Messages Total', value: data.messagesTotal },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-4">
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value.toLocaleString()}</div>
                <div className="text-xs text-[var(--text-muted)] mt-1">{stat.label}</div>
                <div className="mt-3 h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min((stat.value / maxMessages) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <h3 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Active S2S Routes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['From', 'To', 'State', 'Established'].map((h) => (
                    <th key={h} className="text-left py-2 px-3 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.routes.map((route, i) => (
                  <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                    <td className="py-2 px-3 font-mono text-[var(--text-primary)]">{route.fromDomain}</td>
                    <td className="py-2 px-3 font-mono text-[var(--text-primary)]">{route.toDomain}</td>
                    <td className="py-2 px-3">
                      <span className="text-xs text-green-400">{route.state}</span>
                    </td>
                    <td className="py-2 px-3 text-[var(--text-muted)]">{formatRelative(route.establishedSince)}</td>
                  </tr>
                ))}
                {data.routes.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-[var(--text-muted)]">No active routes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function RoomMessagesPanel({ room, onBack }: { room: Room; onBack: () => void }) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'rooms', room.id, 'messages'],
    queryFn: () => messagesApi.getRoomMessages(room.id, undefined, 100),
  })

  const deleteMsgMutation = useMutation({
    mutationFn: (msgId: string) => messagesApi.delete(msgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms', room.id, 'messages'] })
      toast.success('Message deleted')
    },
    onError: () => toast.error('Failed to delete message'),
  })

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="px-3 py-1.5 text-xs bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-muted)] rounded-md hover:text-[var(--text-primary)] transition-colors"
        >
          Back to rooms
        </button>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          #{room.name}
          <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">
            {room.isPublic ? 'public' : 'private'}
          </span>
        </h2>
      </div>

      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

      {data && data.messages.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-8">No messages in this room</p>
      )}

      {data && data.messages.length > 0 && (
        <div className="space-y-1">
          {data.messages.map((msg: Message) => (
            <div
              key={msg.id}
              className={`flex items-start justify-between gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] group ${msg.deletedAt ? 'opacity-40' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-blue-400 mr-2">{msg.author.username}</span>
                <span className="text-xs text-[var(--text-muted)] mr-2">{formatRelative(msg.createdAt)}</span>
                {msg.deletedAt ? (
                  <span className="text-xs italic text-[var(--text-muted)]">deleted</span>
                ) : (
                  <span className="text-sm text-[var(--text-primary)] break-words">{msg.content}</span>
                )}
              </div>
              {!msg.deletedAt && (
                <button
                  onClick={() => {
                    if (confirm('Delete this message?')) deleteMsgMutation.mutate(msg.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-all"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RoomsManagementPanel() {
  const queryClient = useQueryClient()
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const { data: rooms, isLoading } = useQuery<Room[]>({
    queryKey: ['admin', 'rooms'],
    queryFn: () => roomsApi.list(),
  })

  const deleteRoomMutation = useMutation({
    mutationFn: (roomId: string) => roomsApi.delete(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rooms'] })
      toast.success('Room deleted')
    },
    onError: () => toast.error('Failed to delete room'),
  })

  if (selectedRoom) {
    return <RoomMessagesPanel room={selectedRoom} onBack={() => setSelectedRoom(null)} />
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">All Rooms</h2>

      {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}

      {rooms && rooms.length === 0 && (
        <p className="text-center text-[var(--text-muted)] py-8">No rooms found</p>
      )}

      {rooms && rooms.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                {['Name', 'Type', 'Members', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
                  <td className="py-2 px-3">
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
                    >
                      #{room.name}
                    </button>
                  </td>
                  <td className="py-2 px-3">
                    <span className={`text-xs font-medium ${room.isPublic ? 'text-green-400' : 'text-yellow-400'}`}>
                      {room.isPublic ? 'public' : 'private'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">
                    {room._count?.members ?? room.memberCount ?? '—'}
                  </td>
                  <td className="py-2 px-3 text-[var(--text-muted)]">{formatRelative(room.createdAt)}</td>
                  <td className="py-2 px-3 flex gap-2">
                    <button
                      onClick={() => setSelectedRoom(room)}
                      className="px-2 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border)] rounded transition-colors"
                    >
                      Messages
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete room "${room.name}"? This cannot be undone.`)) {
                          deleteRoomMutation.mutate(room.id)
                        }
                      }}
                      className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-900/10 hover:bg-red-900/20 border border-red-900/30 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export function AdminPage() {
  const [tab, setTab] = useState<'rooms' | 'connections' | 'federation'>('rooms')

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6">
      <h1 className="font-mono text-2xl font-bold text-[var(--accent)] mb-6">Admin Panel</h1>

      <div className="flex border-b border-[var(--border)] mb-6">
        {([
          { key: 'rooms', label: 'Rooms & Messages' },
          { key: 'connections', label: 'Jabber Connections' },
          { key: 'federation', label: 'Federation Traffic' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-6 py-2.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-blue-400 border-b-2 border-blue-400 -mb-px'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl p-6">
        {tab === 'rooms' && <RoomsManagementPanel />}
        {tab === 'connections' && <JabberDashboard />}
        {tab === 'federation' && <FederationStatsPanel />}
      </div>
    </div>
  )
}
