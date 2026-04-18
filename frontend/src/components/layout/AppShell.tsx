import { useEffect, useState } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useUiStore } from '../../store/uiStore'
import { useUnreadStore } from '../../store/unreadStore'
import { useAuthStore } from '../../store/authStore'
import { getSocket } from '../../api/socket'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { RoomMembersPanel } from './RoomMembersPanel'
import { MessageList } from '../chat/MessageList'
import { MessageInput } from '../chat/MessageInput'
import { RoomHeader } from '../rooms/RoomHeader'
import { EmptyState } from '../common/EmptyState'
import type { Message } from '../../api/messages'
import { useRooms } from '../../hooks/useRooms'
import { useFriends } from '../../hooks/useFriends'
import { useQuery } from '@tanstack/react-query'
import { roomsApi } from '../../api/rooms'
import type { RoomMember } from '../../api/rooms'
import clsx from 'clsx'

export function AppShell() {
  useSocket()
  const { activeChannel, sidebarOpen, membersPanelOpen } = useUiStore()
  const clearUnread = useUnreadStore((s) => s.clearUnread)
  const currentUser = useAuthStore((s) => s.user)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const { data: rooms } = useRooms()
  useFriends() // subscribe to friend invalidations
  const [networkError, setNetworkError] = useState(false)

  // Track socket connection state
  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const onDisconnect = () => setNetworkError(true)
    const onConnect = () => setNetworkError(false)
    socket.on('disconnect', onDisconnect)
    socket.on('connect', onConnect)
    return () => {
      socket.off('disconnect', onDisconnect)
      socket.off('connect', onConnect)
    }
  })

  // Join/leave socket channels when active channel changes
  useEffect(() => {
    const socket = getSocket()
    if (!socket || !activeChannel) return

    if (activeChannel.type === 'room') {
      socket.emit('room:join', { roomId: activeChannel.id })
      return () => {
        socket.emit('room:leave', { roomId: activeChannel.id })
      }
    } else if (activeChannel.type === 'dialog') {
      socket.emit('dm:join', { dialogId: activeChannel.dialogId })
    }
  }, [activeChannel])

  // Clear unread when switching channels
  useEffect(() => {
    if (!activeChannel) return
    const key = activeChannel.type === 'room' ? activeChannel.id : activeChannel.dialogId
    clearUnread(key)
  }, [activeChannel, clearUnread])

  // Update document title with unread count
  const totalUnread = useUnreadStore((s) => s.totalUnread())
  useEffect(() => {
    const base = 'IRC Chat'
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base
  }, [totalUnread])

  const activeRoom =
    activeChannel?.type === 'room' ? rooms?.find((r) => r.id === activeChannel.id) : null

  const { data: members } = useQuery<RoomMember[]>({
    queryKey: ['rooms', activeRoom?.id, 'members'],
    queryFn: () => roomsApi.getMembers(activeRoom!.id),
    enabled: !!activeRoom?.id,
  })

  const myMembership = members?.find((m) => m.userId === currentUser?.id)
  const isAdmin = !!(activeRoom && (currentUser?.id === activeRoom.ownerId || myMembership?.isAdmin))

  const handleSend = (content: string, attachmentIds: string[], replyToId?: string) => {
    const socket = getSocket()
    if (!socket) return
    if (activeChannel?.type === 'room') {
      socket.emit('message:send', {
        roomId: activeChannel.id,
        content,
        replyToId,
        attachmentIds,
      })
    } else if (activeChannel?.type === 'dialog') {
      socket.emit('message:send', {
        dialogId: activeChannel.dialogId,
        content,
        replyToId,
        attachmentIds,
      })
    }
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <TopBar />

      {networkError && (
        <div className="px-4 py-2 text-xs text-center bg-red-900/40 text-red-300 border-b border-red-800">
          Connection lost. Reconnecting...
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Message area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeChannel?.type === 'room' && activeRoom && (
            <RoomHeader room={activeRoom} />
          )}

          {activeChannel ? (
            <>
              <MessageList
                roomId={activeChannel.type === 'room' ? activeChannel.id : undefined}
                dialogId={activeChannel.type === 'dialog' ? activeChannel.dialogId : undefined}
                isAdmin={isAdmin}
                onReply={setReplyTo}
              />
              <MessageInput
                roomId={activeChannel.type === 'room' ? activeChannel.id : undefined}
                dialogId={activeChannel.type === 'dialog' ? activeChannel.dialogId : undefined}
                replyTo={replyTo}
                onCancelReply={() => setReplyTo(null)}
                onSend={handleSend}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <EmptyState
                icon="💬"
                title="Welcome to IRC Chat"
                description="Select a room or contact from the sidebar to start chatting."
              />
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className={clsx(
          'transition-all duration-200',
          sidebarOpen ? 'block' : 'hidden md:block'
        )}>
          <div className="flex h-full">
            {activeChannel?.type === 'room' && activeRoom && membersPanelOpen && (
              <RoomMembersPanel roomId={activeRoom.id} ownerId={activeRoom.ownerId} />
            )}
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
