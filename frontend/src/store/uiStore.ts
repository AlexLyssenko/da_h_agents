import { create } from 'zustand'

type ActiveChannel =
  | { type: 'room'; id: string }
  | { type: 'dialog'; dialogId: string; userId: string; username: string }
  | null

interface UiState {
  activeChannel: ActiveChannel
  sidebarOpen: boolean
  membersPanelOpen: boolean
  setActiveChannel: (channel: ActiveChannel) => void
  setSidebarOpen: (open: boolean) => void
  setMembersPanelOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUiStore = create<UiState>((set) => ({
  activeChannel: null,
  sidebarOpen: true,
  membersPanelOpen: false,

  setActiveChannel: (channel) => set({ activeChannel: channel }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMembersPanelOpen: (open) => set({ membersPanelOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}))
