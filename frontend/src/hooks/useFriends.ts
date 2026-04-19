import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { friendsApi } from '../api/friends'
import { getSocket } from '../api/socket'

export function useFriends() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()
    if (!socket) return
    const handler = () => queryClient.invalidateQueries({ queryKey: ['friends'] })
    socket.on('friend:request', handler)
    socket.on('friend:accepted', handler)
    socket.on('friend:removed', handler)
    return () => {
      socket.off('friend:request', handler)
      socket.off('friend:accepted', handler)
      socket.off('friend:removed', handler)
    }
  }, [queryClient])

  return useQuery({
    queryKey: ['friends'],
    queryFn: () => friendsApi.list(),
  })
}
