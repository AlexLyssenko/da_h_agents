# Chat Application — Architecture & Shared Contracts

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, Socket.io-client, React Query, Zustand |
| Backend | Node.js 20, Express, Socket.io, Prisma ORM |
| Database | PostgreSQL 15 |
| File Storage | Local filesystem (multer) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Real-time | WebSocket via Socket.io |
| Optional | ejabberd (Jabber/XMPP federation) |

---

## Project Directory Structure

```
/
├── backend/                 # Node.js backend (also referred to as "server" in task files)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   ├── routes/          # REST endpoints
│   │   ├── socket/          # Socket.io event handlers
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── jobs/            # Presence heartbeat, cleanup
│   ├── uploads/             # Local file storage (gitignored)
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/                # React frontend (also referred to as "client" in task files)
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── api/             # REST + socket clients
    │   ├── store/           # Zustand stores
    │   ├── hooks/
    │   ├── components/
    │   │   ├── layout/
    │   │   ├── chat/
    │   │   ├── rooms/
    │   │   ├── contacts/
    │   │   ├── modals/
    │   │   └── admin/
    │   └── pages/
    ├── package.json
    ├── vite.config.ts
    └── tsconfig.json
```

---

## Database Schema (Prisma)

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  passwordHash  String
  isAdmin       Boolean   @default(false)
  createdAt     DateTime  @default(now())
  sessions      Session[]
  ownedRooms    Room[]    @relation("RoomOwner")
  roomMembers   RoomMember[]
  sentMessages  Message[]
  friendsSent   Friendship[] @relation("Requester")
  friendsRecv   Friendship[] @relation("Recipient")
  bansGiven     UserBan[] @relation("Banner")
  bansReceived  UserBan[] @relation("Banned")
  roomBans      RoomBan[]
  presence      UserPresence?
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  userAgent String?
  ip        String?
  createdAt DateTime @default(now())
  lastSeen  DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model UserPresence {
  userId    String   @id
  status    PresenceStatus @default(OFFLINE)
  updatedAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum PresenceStatus { ONLINE AFK OFFLINE }

model Friendship {
  id          String   @id @default(cuid())
  requesterId String
  recipientId String
  status      FriendStatus @default(PENDING)
  createdAt   DateTime @default(now())
  requester   User @relation("Requester", fields: [requesterId], references: [id], onDelete: Cascade)
  recipient   User @relation("Recipient", fields: [recipientId], references: [id], onDelete: Cascade)
  @@unique([requesterId, recipientId])
}

enum FriendStatus { PENDING ACCEPTED }

model UserBan {
  id        String   @id @default(cuid())
  bannerId  String
  bannedId  String
  createdAt DateTime @default(now())
  banner    User @relation("Banner", fields: [bannerId], references: [id], onDelete: Cascade)
  banned    User @relation("Banned", fields: [bannedId], references: [id], onDelete: Cascade)
  @@unique([bannerId, bannedId])
}

model Room {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  isPublic    Boolean  @default(true)
  ownerId     String
  createdAt   DateTime @default(now())
  owner       User     @relation("RoomOwner", fields: [ownerId], references: [id])
  members     RoomMember[]
  messages    Message[]
  bans        RoomBan[]
}

model RoomMember {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  isAdmin   Boolean  @default(false)
  joinedAt  DateTime @default(now())
  room      Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([roomId, userId])
}

model RoomBan {
  id        String   @id @default(cuid())
  roomId    String
  userId    String
  bannedBy  String
  createdAt DateTime @default(now())
  room      Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([roomId, userId])
}

model Message {
  id          String   @id @default(cuid())
  roomId      String?          # null = personal dialog
  dialogId    String?          # sorted pair: "userId1:userId2"
  authorId    String
  content     String?  @db.VarChar(3072)
  replyToId   String?
  editedAt    DateTime?
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  room        Room?    @relation(fields: [roomId], references: [id], onDelete: Cascade)
  author      User     @relation(fields: [authorId], references: [id])
  replyTo     Message? @relation("Replies", fields: [replyToId], references: [id])
  replies     Message[] @relation("Replies")
  attachments Attachment[]
}

model Attachment {
  id           String   @id @default(cuid())
  messageId    String
  filename     String
  storagePath  String
  mimeType     String
  size         Int
  comment      String?
  createdAt    DateTime @default(now())
  message      Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
}
```

---

## REST API — Endpoint Reference

### Auth
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, return access+refresh tokens |
| POST | /api/auth/logout | Invalidate current session |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/password/reset | Initiate password reset (always 200, logs token to console) |
| PUT | /api/auth/password/reset/confirm | Confirm reset — body: `{ token, newPassword }` |
| PUT | /api/auth/password | Change password (authenticated) |
| DELETE | /api/auth/account | Delete account |

### Sessions
| Method | Path | Description |
|---|---|---|
| GET | /api/sessions | List active sessions |
| DELETE | /api/sessions/:id | Logout specific session |

### Users
| Method | Path | Description |
|---|---|---|
| GET | /api/users/me | Get current user profile |
| GET | /api/users/search?q= | Search users by username |

### Friends
| Method | Path | Description |
|---|---|---|
| GET | /api/friends | List friends + pending requests |
| POST | /api/friends/request | Send friend request |
| PUT | /api/friends/:id/accept | Accept friend request |
| DELETE | /api/friends/:id | Remove friend |
| POST | /api/friends/ban | Ban a user |
| DELETE | /api/friends/ban/:userId | Unban a user |

### Rooms
| Method | Path | Description |
|---|---|---|
| GET | /api/rooms | List public rooms (catalog) |
| POST | /api/rooms | Create room |
| GET | /api/rooms/:id | Get room info |
| PUT | /api/rooms/:id | Update room |
| DELETE | /api/rooms/:id | Delete room (owner only) |
| POST | /api/rooms/:id/join | Join public room |
| POST | /api/rooms/:id/leave | Leave room |
| POST | /api/rooms/:id/invite | Invite user to private room |
| GET | /api/rooms/:id/members | List members with presence |
| DELETE | /api/rooms/:id/members/:userId | Remove/ban member |
| GET | /api/rooms/:id/bans | List banned users |
| DELETE | /api/rooms/:id/bans/:userId | Unban user |
| POST | /api/rooms/:id/admins/:userId | Promote to admin |
| DELETE | /api/rooms/:id/admins/:userId | Demote from admin |

### Messages
| Method | Path | Description |
|---|---|---|
| GET | /api/rooms/:id/messages?cursor=&limit= | Paginated room history |
| GET | /api/dialogs/:dialogId/messages?cursor=&limit= | Paginated DM history |
| PUT | /api/messages/:id | Edit message |
| DELETE | /api/messages/:id | Delete message |

### Attachments
| Method | Path | Description |
|---|---|---|
| POST | /api/attachments | Upload file (multipart) |
| GET | /api/attachments/:id | Download file (auth required) |

---

## Shared Response Shapes

### User object (returned by login, refresh, /api/users/me, and embedded in other responses)
```ts
{
  id:        string   // cuid
  username:  string
  email:     string
  isAdmin:   boolean  // app-level admin — gates the /admin route
  createdAt: string   // ISO 8601
}
```
> `passwordHash` must **never** appear in any API response.

---

## WebSocket Events

### Client → Server
```
auth                  { token }
presence:heartbeat    { status: 'online' | 'afk' }
room:join             { roomId }
room:leave            { roomId }
message:send          { roomId?, dialogId?, content, replyToId?, attachmentIds[] }
message:edit          { messageId, content }
message:delete        { messageId }
typing:start          { roomId?, dialogId? }
typing:stop           { roomId?, dialogId? }
```

### Server → Client
```
presence:update       { userId, status }
message:new           { message }
message:edited        { message }
message:deleted       { messageId, roomId?, dialogId? }
room:updated          { room }
room:member:joined    { roomId, user }
room:member:left      { roomId, userId }
friend:request        { friendship }
friend:accepted       { friendship }
notification:unread   { roomId?, dialogId?, count }
typing                { userId, roomId?, dialogId? }
error                 { code, message }
```

---

## Auth Flow
1. Login → server returns `{ accessToken, refreshToken, sessionId }`
2. `accessToken` TTL: 15 minutes, stored in memory (Zustand)
3. `refreshToken` TTL: 30 days, stored in `httpOnly` cookie
4. On 401, client silently calls `/api/auth/refresh`
5. Socket auth: connect with `auth: { token: accessToken }`

---

## Presence Logic
- Client sends `presence:heartbeat` with `online` every 30 seconds while active
- Client sends `presence:heartbeat` with `afk` after 60s of no DOM events
- Server sets user OFFLINE if no heartbeat received for 90 seconds
- Multi-tab: server tracks per-socket status; user status = most active across all sockets

---

## File Storage
- Stored at `server/uploads/<userId>/<uuid>/<original-filename>`
- Access controlled per request: verify user membership before serving
- Max file: 20 MB; max image: 3 MB (validated server-side via multer)

---

## Jabber / XMPP (Advanced — Section 6)
- Use `ejabberd` as XMPP server, bridged to the app database via external auth module
- Node.js XMPP library: `@xmpp/client` or `node-xmpp-server`
- Federation requires two ejabberd instances with S2S (server-to-server) enabled
- Admin UI panels: Connection Dashboard, Federation Traffic Statistics
- Federation runs two local ejabberd instances (`ejabberd-a`, `ejabberd-b`) on separate ports, each paired with a Node.js server process; see `scripts/start-federation.sh`
