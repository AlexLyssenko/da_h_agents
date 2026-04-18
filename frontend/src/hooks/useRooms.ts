import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { roomsApi } from '../api/rooms'
import { getSocket } from '../api/socket'

export function useRooms() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = () => queryClient.invalidateQueries({ queryKey: ['rooms', 'mine'] })
    socket.on('room:updated', handler)
    socket.on('room:member:joined', handler)
    socket.on('room:member:left', handler)
    return () => {
      socket.off('room:updated', handler)
      socket.off('room:member:joined', handler)
      socket.off('room:member:left', handler)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['rooms', 'mine'],
    queryFn: () => roomsApi.getMyRooms(),
  })
}
