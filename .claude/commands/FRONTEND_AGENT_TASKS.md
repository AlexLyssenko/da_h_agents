# Frontend Agent Tasks — Chat Client
## Stack: React 18 + Vite + TailwindCSS + Socket.io-client + Zustand + React Query

> Read `ARCHITECTURE.md` first — it defines all REST endpoints, WebSocket events,
> auth flow, and shared data shapes. This file contains only UI/client implementation tasks.

---

## 0. Project Bootstrap

### Task 0.1 — Initialize project ✅
```bash
npm create vite@latest client -- --template react-ts
cd client
npm install
```

Install deps:
```
zustand
@tanstack/react-query
socket.io-client
axios
react-router-dom
tailwindcss @tailwindcss/vite
clsx
date-fns
emoji-mart          # emoji picker
react-intersection-observer   # infinite scroll trigger
react-dropzone      # drag-and-drop uploads
react-hot-toast     # notifications
```

### Task 0.2 — Project structure ✅
```
src/
  api/
    client.ts          # axios instance with interceptors
    socket.ts          # socket.io singleton
    auth.ts
    rooms.ts
    messages.ts
    friends.ts
    attachments.ts
    admin.ts
  store/
    authStore.ts       # user, accessToken
    presenceStore.ts   # Map<userId, status>
    unreadStore.ts     # Map<roomId|dialogId, count>
    uiStore.ts         # sidebar collapse state, active room, etc.
  hooks/
    useSocket.ts
    usePresence.ts
    useMessages.ts
    useUnread.ts
    useInfiniteMessages.ts
  components/
    layout/
      AppShell.tsx
      TopBar.tsx
      Sidebar.tsx
      RoomMembersPanel.tsx
    chat/
      MessageList.tsx
      MessageItem.tsx
      MessageInput.tsx
      TypingIndicator.tsx
      MessageBubble.tsx
      ReplyPreview.tsx
      AttachmentPreview.tsx
      EmojiPicker.tsx
    rooms/
      RoomCatalog.tsx
      RoomCard.tsx
      CreateRoomModal.tsx
      RoomHeader.tsx
    contacts/
      ContactList.tsx
      ContactItem.tsx
      FriendRequestModal.tsx
    modals/
      ConfirmDialog.tsx
      BanUserModal.tsx
      ManageAdminsModal.tsx
      BannedUsersModal.tsx
      SessionsModal.tsx
      UserProfileModal.tsx
    admin/
      JabberDashboard.tsx
      FederationStats.tsx
    common/
      Avatar.tsx
      PresenceDot.tsx
      Badge.tsx
      Spinner.tsx
      EmptyState.tsx
  pages/
    LoginPage.tsx
    RegisterPage.tsx
    ChatPage.tsx
    AdminPage.tsx
  utils/
    formatDate.ts
    dialogId.ts        # sort two userIds → "id1:id2"
    fileSize.ts
```

### Task 0.3 — Tailwind config ✅
- Configure dark-first palette — the app should feel like a classic IRC/modern dark chat
- CSS variables for: `--bg-primary`, `--bg-secondary`, `--bg-surface`, `--accent`, `--text-primary`, `--text-muted`, `--border`
- Typography: use `IBM Plex Mono` for usernames/timestamps, `Inter` for body text (loaded from Google Fonts CDN)

---

## 1. Auth Layer

### Task 1.1 — Axios client (`api/client.ts`) ✅
- Base URL from `VITE_API_URL` env
- Request interceptor: attach `Authorization: Bearer <accessToken>` from `authStore`
- Response interceptor: on 401, call `/api/auth/refresh` once, retry original request; on second 401, redirect to `/login`
- `withCredentials: true` (for refresh cookie)

### Task 1.2 — Auth store (`store/authStore.ts`) ✅
```ts
interface AuthState {
  user: { id, username, email } | null
  accessToken: string | null
  sessionId: string | null
  setAuth(user, accessToken, sessionId): void
  clearAuth(): void
}
```
- Persist `user` + `sessionId` in `sessionStorage` (not token — re-fetch on load)
- On app mount: if `sessionId` found in storage, call `/api/auth/refresh` to get new token

### Task 1.3 — Login page (`pages/LoginPage.tsx`) ✅
- Email + password form
- Link to register
- On success: call `authStore.setAuth(...)`, connect socket, navigate to `/`
- Show inline validation errors

### Task 1.4 — Register page (`pages/RegisterPage.tsx`) ✅
- Username + email + password fields
- Show field-level server errors (email taken, username taken)
- On success: auto-login and navigate to `/`

### Task 1.5 — Route guard ✅
- `<ProtectedRoute>` wrapper: redirect to `/login` if not authenticated
- `<GuestRoute>` wrapper: redirect to `/` if already authenticated

---

## 2. Socket Integration

### Task 2.1 — Socket singleton (`api/socket.ts`) ✅
```ts
// Lazy singleton; connect only after login
export const getSocket = () => { ... }
export const connectSocket = (token: string) => { ... }
export const disconnectSocket = () => { ... }
```

### Task 2.2 — useSocket hook ✅
- Connect on mount with current token
- Re-connect on token refresh
- Disconnect on logout
- Central event listener registration (avoid duplicate listeners)

### Task 2.3 — Presence handling (`store/presenceStore.ts`) ✅
```ts
Map<userId, 'ONLINE' | 'AFK' | 'OFFLINE'>
```
- Listen for `presence:update` events; update store
- Heartbeat: every 30s send `presence:heartbeat { status: 'online' }`
- Idle detection: listen for `mousemove, keydown, click, scroll` on `document`; if no event for 60s → send `afk`; on next event → send `online`

### Task 2.4 — Unread store (`store/unreadStore.ts`) ✅
- Listen for `notification:unread` socket event; update `Map<roomId|dialogId, count>`
- Clear count when user opens a chat: call `POST /api/notifications/read`

---

## 3. App Shell & Layout

### Task 3.1 — AppShell (`components/layout/AppShell.tsx`) ✅
Overall layout:
```
┌─────────────────────────────────────────────────────┐
│                    TopBar                           │
├───────────────────────────┬─────────────────────────┤
│                           │  Sidebar                │
│     Message Area          │  (rooms + contacts)     │
│                           ├─────────────────────────┤
│                           │  Room Members Panel     │
├───────────────────────────┴─────────────────────────┤
│                  Message Input                      │
└─────────────────────────────────────────────────────┘
```
- Sidebar on the right as per requirements
- When user enters a room, room list collapses into an accordion
- Room members panel slides in on the right

### Task 3.2 — TopBar (`components/layout/TopBar.tsx`) ✅
- App name / logo on the left
- Active room name in center
- Right side: current user avatar + username, presence dot, settings menu
  - Settings menu: Profile, Sessions, Change Password, Delete Account, Logout

### Task 3.3 — Sidebar (`components/layout/Sidebar.tsx`) ✅
Two sections:
1. **Rooms** — accordion list; each item shows: room name, unread badge
   - "Browse Rooms" button → opens `RoomCatalog`
   - "New Room" button → opens `CreateRoomModal`
2. **Contacts** — accordion list; each item shows: avatar, username, presence dot, unread badge
   - "Add Friend" button → opens `FriendRequestModal`

Accordion behavior: clicking a room/contact expands it as active; list collapses to show only active item + headers

### Task 3.4 — Room Members Panel (`components/layout/RoomMembersPanel.tsx`) ✅
- Lists all members with presence dot
- Shows online first, then AFK, then offline (sorted alphabetically within groups)
- Context menu on member: Send DM (if friends), Invite to Room, Ban (admin only), Promote/Demote Admin (owner only)

---

## 4. Chat Window

### Task 4.1 — Message list (`components/chat/MessageList.tsx`) ✅
- Virtual/windowed scroll using native CSS `overflow-y: auto`
- Infinite scroll upward: use `IntersectionObserver` on sentinel at top; call `useInfiniteMessages` hook
- Auto-scroll to bottom when new message arrives AND user was at bottom (track with scroll event)
- Do NOT auto-scroll if user has scrolled up
- Group consecutive messages from same author (compact display: no repeated avatar/name)
- Date separators between days

### Task 4.2 — Message item (`components/chat/MessageItem.tsx`) ✅
Props: `message, isOwn, isCompact`

Display:
- Avatar + username (skip if compact)
- Timestamp (relative, e.g., "2 min ago"; full on hover)
- Content with emoji rendering
- Reply quote block (if `replyToId`)
- Attachment thumbnails / file chips
- `edited` gray indicator if `editedAt` is set
- Hover actions toolbar (right side): Reply, Edit (own only), Delete (own or admin), React

### Task 4.3 — Inline message actions ✅
- **Reply**: sets reply target in `MessageInput` state
- **Edit**: replaces message bubble content with an inline edit input; Escape to cancel, Enter to save
- **Delete**: opens `ConfirmDialog`; on confirm calls delete API + emits event

### Task 4.4 — Reply preview in message (`components/chat/ReplyPreview.tsx`) ✅
- Displayed above message content
- Shows: quoted author username + first 100 chars of quoted text (or "[attachment]")
- Click scrolls to original message

### Task 4.5 — Message input (`components/chat/MessageInput.tsx`) ✅
Features:
- `<textarea>` that auto-expands (max 6 lines)
- `Shift+Enter` for newline; `Enter` to send
- Emoji picker button (opens `EmojiPicker` popover)
- Attachment button (opens file picker OR drag-and-drop zone)
- Paste to attach images (listen for `paste` event on textarea)
- Active reply bar above input: shows quoted message + ✕ to cancel
- Character counter appears at 80% of 3 KB limit
- Typing events: emit `typing:start` on input, `typing:stop` on blur or after 3s silence

### Task 4.6 — Emoji picker (`components/chat/EmojiPicker.tsx`) ✅
- Use `emoji-mart` `<Picker>` component
- Positioned as a floating popover above the input
- On emoji select: insert at cursor position in textarea

### Task 4.7 — Typing indicator (`components/chat/TypingIndicator.tsx`) ✅
- Listen for `typing` socket events for current room/dialog
- Show "Alice is typing…" or "Alice and Bob are typing…" with animated dots
- Disappear after 5s of no new typing events from that user

### Task 4.8 — Attachment preview (`components/chat/AttachmentPreview.tsx`) ✅
- Images: inline thumbnail (max 300px wide); click to open lightbox
- Files: chip with icon, filename, size; click to download
- Upload progress bar while uploading

---

## 5. Rooms

### Task 5.1 — Room catalog (`components/rooms/RoomCatalog.tsx`) ✅
- Modal or slide-over panel
- Search input (debounced 300ms)
- Lists public rooms: name, description, member count
- "Join" button; grayed out if already a member
- Pagination or infinite scroll

### Task 5.2 — Create room modal (`components/rooms/CreateRoomModal.tsx`) ✅
- Fields: Name (required), Description, Visibility toggle (Public / Private)
- Submit → create room → navigate to it → add to sidebar

### Task 5.3 — Room header (`components/rooms/RoomHeader.tsx`) ✅
- Room name, description (truncated, expand on click)
- Member count
- Room settings button (owner/admin only) → dropdown: Edit Room, Manage Admins, View Bans, Delete Room

### Task 5.4 — Room settings flows ✅
- **Edit room**: inline modal; update name/description/visibility
- **Manage admins**: list current admins; promote/demote buttons
- **View bans**: list banned users; unban button; shows who banned each user
- **Delete room**: `ConfirmDialog` with room name confirmation typed in input

---

## 6. Contacts & Direct Messages

### Task 6.1 — Contact list (`components/contacts/ContactList.tsx`) ✅
Three sub-sections:
1. **Friends** (accepted) — sorted by presence then alpha
2. **Pending incoming** — Accept / Decline buttons
3. **Pending outgoing** — Cancel button

### Task 6.2 — Friend request modal (`components/contacts/FriendRequestModal.tsx`) ✅
- Username search input (calls `GET /api/users/search`)
- Optional message field
- Send button

### Task 6.3 — DM flow ✅
- Clicking a friend in contact list opens DM in message area
- `dialogId` computed as sorted `userId1:userId2`
- History fetched via `GET /api/dialogs/:dialogId/messages`
- All message features (reply, edit, delete, attachments) work identically to rooms

### Task 6.4 — User ban from DM ✅
- "Block user" option in DM header menu
- On confirm: call ban API; DM history becomes read-only; input is disabled with message "You have blocked this user"
- If other party banned you: similar frozen state

---

## 7. Notifications & Unread State

### Task 7.1 — Unread badges ✅
- Sidebar room/contact items show a filled badge with count
- Badge disappears when chat is opened
- If count > 99 show "99+"

### Task 7.2 — Browser title badge ✅
- Prepend `(N)` to document title when there are unread messages and tab is not focused
- Clear on tab focus

### Task 7.3 — Toast notifications ✅
- Friend request received → toast with Accept/Decline actions
- Room invitation received → toast with Join action
- System errors → error toasts

---

## 8. User Profile & Settings

### Task 8.1 — Sessions modal (`components/modals/SessionsModal.tsx`) ✅
- List all sessions: browser UA, IP, last seen, "(current)" label
- "Log out" button per session
- "Log out all other sessions" bulk action

### Task 8.2 — Change password modal ✅
- Current password + new password + confirm
- Inline validation

### Task 8.3 — Delete account modal ✅
- Warning text + password confirmation input
- On confirm: call delete API → clear auth → navigate to `/login`

---

## 9. Admin — Jabber Panels (Advanced)

### Task 9.1 — Admin page (`pages/AdminPage.tsx`)
- Route: `/admin` (show only if user is app-level admin — add `isAdmin` flag to User model)
- Tabs: "Jabber Connections" | "Federation Traffic"

### Task 9.2 — Jabber connection dashboard (`components/admin/JabberDashboard.tsx`)
- Poll `GET /api/admin/jabber/connections` every 5s
- Display table: JID, resource, IP, connected since, presence
- Summary stats: total connected, online, AFK

### Task 9.3 — Federation stats panel (`components/admin/FederationStats.tsx`)
- Poll `GET /api/admin/jabber/federation` every 5s
- Display: active S2S routes (from-domain, to-domain, state, established-since)
- Message counters: messages routed today / total; chart using CSS bar chart (no external chart lib)
- Refresh button for manual poll

---

## 10. UX Polish

### Task 10.1 — Loading states ✅
- Skeleton loaders for message history on first load
- Spinner in sidebar while rooms/contacts load
- Disabled send button while message is in-flight

### Task 10.2 — Error states ✅
- Empty state component for: no rooms joined, no friends, no messages yet
- Network error banner (appears if socket disconnects; auto-hides on reconnect)

### Task 10.3 — Infinite scroll behavior ✅
- Scroll position preserved after loading older messages (maintain scroll anchor)
- "Jump to bottom" FAB appears when scrolled up > 300px; shows unread count

### Task 10.4 — Responsive layout ✅
- On narrow screens (< 768px): sidebar overlays as drawer; toggle via hamburger in TopBar
- Message area full width on mobile

### Task 10.5 — Accessibility ✅
- All modals trap focus and close on Escape
- `aria-label` on icon-only buttons
- Keyboard navigation for message context menu

---

## 11. API Hook Patterns

### Task 11.1 — `useInfiniteMessages(roomId?, dialogId?)` ✅
```ts
// Uses React Query's useInfiniteQuery
// queryFn fetches one page given cursor
// Returns: { pages, fetchNextPage, hasNextPage, isFetchingNextPage }
```

### Task 11.2 — `useRooms()` ✅
- Fetches user's joined rooms
- Invalidated when `room:updated` socket event received

### Task 11.3 — `useFriends()` ✅
- Fetches friends + pending requests
- Invalidated on `friend:request`, `friend:accepted` socket events

### Task 11.4 — `usePresence(userIds: string[])` ✅
- Returns presence map from `presenceStore`
- Updates reactively as socket events arrive

### Task 11.5 — `useTyping(roomId?, dialogId?)` ✅
- Returns `{ typingUsers: User[] }`
- Listens to `typing` socket events for current channel

---

## 12. Environment & Build

### Task 12.1 — Environment variables ✅
```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### Task 12.2 — Production build ✅
- `npm run build` produces a static bundle in `frontend/dist/`
- To serve locally for smoke-testing: `npm run preview` (Vite preview server on port 4173)
- The backend at port 4000 must be running when the preview is served
- Vite config must proxy `/api` and `/socket.io` to `http://localhost:4000` in dev mode:
  ```ts
  // vite.config.ts
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/socket.io': { target: 'http://localhost:4000', ws: true },
    },
  }
  ```

---

## Acceptance Criteria Checklist

- [x] Login persists across browser close/reopen (refresh token flow works)
- [x] Presence dot updates within 2s of user going offline
- [x] Sending a message delivers it instantly (optimistic update)
- [x] Scrolling up loads older messages without losing scroll position
- [x] Unread badge increments when receiving a message in unfocused chat
- [x] File paste in textarea triggers upload
- [x] Reply quote shows correctly in message thread
- [x] Editing a message shows "edited" indicator
- [x] Room sidebar collapses into accordion when a room is active
- [x] Members panel shows real-time presence
- [x] Admin modals accessible only to room owners/admins
- [ ] Jabber admin page polled (skipped) every 5s (data updates without page refresh)
- [x] App works correctly with 2+ browser tabs open for same user
