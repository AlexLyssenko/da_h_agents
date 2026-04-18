# Backend Agent Tasks — Chat Server
## Stack: Node.js 20 + Express + Prisma + PostgreSQL + Socket.io

> Read `ARCHITECTURE.md` first — it contains the full DB schema, REST endpoint table,
> WebSocket event catalogue, auth flow, and file storage conventions.
> This file contains only the implementation tasks.

---

## 0. Project Bootstrap

### Task 0.1 — Initialize project
- `npm init`, configure TypeScript (`tsconfig.json`), ESLint, Prettier
- Install core deps:
  ```
  express, cors, helmet, cookie-parser, morgan
  prisma, @prisma/client
  socket.io
  jsonwebtoken, bcrypt
  multer
  zod                  # request validation
  dotenv
  ```
- Dev deps: `ts-node-dev`, `@types/*`
- Create `.env.example`:
  ```
  DATABASE_URL=postgresql://postgres@localhost:5432/chat-ai
  JWT_ACCESS_SECRET=
  JWT_REFRESH_SECRET=
  PORT=4000
  UPLOAD_DIR=./uploads
  MAX_FILE_SIZE_BYTES=20971520
  MAX_IMAGE_SIZE_BYTES=3145728
  ```

### Task 0.2 — Database setup (local PostgreSQL)
- Database name: `chat-ai`, running on `localhost:5432`
- Verify the database exists before running migrations:
  ```powershell
  psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='chat-ai';"
  # If missing:
  psql -U postgres -c "CREATE DATABASE ""chat-ai"";"
  ```
- `DATABASE_URL` in `backend\.env` must be:
  ```
  postgresql://postgres:<password>@localhost:5432/chat-ai
  ```
  Replace `<password>` with the PostgreSQL superuser password set during installation.
- No Docker or docker-compose files are needed for the database.

### Task 0.3 — Prisma setup
- Write `prisma/schema.prisma` exactly as defined in ARCHITECTURE.md
- Create initial migration: `prisma migrate dev --name init`
- Add seed script: create one admin user and two sample public rooms

---

## 1. Authentication & Sessions

### Task 1.1 — Registration `POST /api/auth/register`
- Validate body with Zod: `{ email, password, username }`
- Check uniqueness of email and username (return 409 with field name on conflict)
- Hash password with bcrypt (cost 12)
- Create `User` and initial `UserPresence` (OFFLINE)
- Return `{ user: { id, username, email } }`

### Task 1.2 — Login `POST /api/auth/login`
- Validate credentials; return 401 on failure
- Generate `accessToken` (JWT, 15 min) and `refreshToken` (JWT, 30 days)
- Create `Session` row with `userAgent` and `ip` from request
- Set `refreshToken` as `httpOnly; Secure; SameSite=Strict` cookie
- Return `{ accessToken, sessionId, user }`

### Task 1.3 — Token refresh `POST /api/auth/refresh`
- Read `refreshToken` from cookie
- Verify JWT and look up matching `Session`
- Issue new `accessToken`; rotate `refreshToken` (update cookie + session row)

### Task 1.4 — Logout `POST /api/auth/logout`
- Require valid access token
- Delete `Session` by current `sessionId`
- Clear refresh cookie

### Task 1.5 — Session list & remote logout
- `GET /api/sessions` — return all sessions for current user (id, userAgent, ip, lastSeen, isCurrent)
- `DELETE /api/sessions/:id` — delete any session owned by current user

### Task 1.6 — Password change `PUT /api/auth/password`
- Require current password + new password
- Validate strength (min 8 chars)
- Re-hash and save

### Task 1.7 — Password reset `POST /api/auth/password/reset`
- Accept `{ email }`; always respond 200 (no user enumeration)
- Generate signed reset token (short TTL, store hash in DB or signed JWT)
- Log token to console (email sending not required)
- `PUT /api/auth/password/reset/confirm` — validate token, update hash

### Task 1.8 — Delete account `DELETE /api/auth/account`
- Require password confirmation
- Delete rooms owned by user (cascade deletes messages + attachments from disk too — write a service method)
- Remove user (cascade handles the rest via Prisma)

### Task 1.9 — Auth middleware
- `requireAuth` middleware: verify `Authorization: Bearer <token>`, attach `req.user`
- `optionalAuth`: same but doesn't reject if missing

---

## 2. User Presence

### Task 2.1 — Presence store
- Maintain an in-memory map `Map<userId, { status, socketIds: Set<string> }>`
- Persist to `UserPresence` table on each status change

### Task 2.2 — Socket auth handshake
- On `connection`: verify `socket.handshake.auth.token`, attach `socket.userId`
- Register socket in presence map; set user ONLINE; broadcast `presence:update`
- On `disconnect`: remove socket from map; if no sockets remain → set OFFLINE → broadcast

### Task 2.3 — Heartbeat handler
- Listen for `presence:heartbeat { status }` from client
- Update per-socket status in map; recalculate effective user status:
  - Any socket `online` → user is ONLINE
  - All sockets `afk` → user is AFK
- Broadcast `presence:update` only if effective status changed
- Server-side watchdog: every 30s evict sockets that haven't sent heartbeat in 90s

### Task 2.4 — Bulk presence query
- `GET /api/users/presence?ids=id1,id2,...` — return `{ [userId]: status }` from in-memory map

---

## 3. Friends & User Bans

### Task 3.1 — Friend request `POST /api/friends/request`
- Body: `{ username, message? }`
- Resolve username → userId
- Check: not self, no existing friendship/ban, not already friends
- Create `Friendship` with status PENDING
- Emit `friend:request` to recipient via Socket.io if online

### Task 3.2 — Accept friend request `PUT /api/friends/:id/accept`
- Verify current user is the recipient
- Update status to ACCEPTED
- Emit `friend:accepted` to requester

### Task 3.3 — Remove friend `DELETE /api/friends/:id`
- Delete `Friendship` row; both directions should be checked

### Task 3.4 — List friends `GET /api/friends`
- Return: accepted friends (with presence), pending incoming requests, pending outgoing requests

### Task 3.5 — Ban user `POST /api/friends/ban`
- Body: `{ userId }`
- Create `UserBan`
- If friendship exists → delete it
- Emit socket event to banned user to inform they've been banned (so UI freezes the DM)

### Task 3.6 — Unban user `DELETE /api/friends/ban/:userId`
- Delete `UserBan` row

---

## 4. Chat Rooms

### Task 4.1 — Create room `POST /api/rooms`
- Body validated with Zod: `{ name, description?, isPublic }`
- Check room name uniqueness (409 on conflict)
- Create `Room` + add creator as member with `isAdmin: true`

### Task 4.2 — Public room catalog `GET /api/rooms`
- Query: `?search=&page=&limit=`
- Return public rooms only, with member count; exclude rooms user is banned from

### Task 4.3 — Get room `GET /api/rooms/:id`
- Verify user is a member (or room is public and user is not banned)
- Return room details + member count

### Task 4.4 — Join room `POST /api/rooms/:id/join`
- Room must be public; user must not be banned from room
- Create `RoomMember`
- Broadcast `room:member:joined` to room socket channel

### Task 4.5 — Leave room `POST /api/rooms/:id/leave`
- Owner cannot leave — return 403 with clear message
- Delete `RoomMember`; broadcast `room:member:left`

### Task 4.6 — Invite to private room `POST /api/rooms/:id/invite`
- Requester must be a member; room must be private
- Target must not be banned from room
- Create `RoomMember` for target
- Emit `room:updated` to invited user's sockets

### Task 4.7 — Delete room `DELETE /api/rooms/:id`
- Owner only
- Delete all attachment files from disk (iterate `Attachment` records)
- Prisma cascade deletes messages, attachments rows, members, bans
- Broadcast `room:updated` with `{ deleted: true }` to room channel

### Task 4.8 — Member management
- `GET /api/rooms/:id/members` — return members with username + presence status
- `DELETE /api/rooms/:id/members/:userId` — admin/owner only; create `RoomBan`; remove `RoomMember`; emit kick event to target socket

### Task 4.9 — Ban management
- `GET /api/rooms/:id/bans` — admin only; return banned users + who banned them
- `DELETE /api/rooms/:id/bans/:userId` — remove from `RoomBan`

### Task 4.10 — Admin promotion/demotion
- `POST /api/rooms/:id/admins/:userId` — owner only; set `isAdmin: true`
- `DELETE /api/rooms/:id/admins/:userId` — owner only (cannot demote self); set `isAdmin: false`

### Task 4.11 — Room update `PUT /api/rooms/:id`
- Owner only; update name (check uniqueness) / description / isPublic
- Broadcast `room:updated`

---

## 5. Messaging

### Task 5.1 — Message send (WebSocket)
Listen for `message:send`:
- Payload: `{ roomId?, dialogId?, content, replyToId?, attachmentIds[] }`
- Validate: content ≤ 3072 bytes UTF-8; at least one of content or attachmentIds
- For room messages: verify sender is a member and not banned
- For DM (dialogId): verify both users are friends and neither has banned the other
- `dialogId` format: sort two userIds alphabetically, join with `:`
- Create `Message` in DB; connect `Attachment` rows (already uploaded)
- Broadcast `message:new` to all sockets in room channel (or both DM users)

### Task 5.2 — Message history (REST)
- `GET /api/rooms/:id/messages?cursor=<messageId>&limit=50` — cursor-based pagination (older-first when scrolling up)
- `GET /api/dialogs/:dialogId/messages?cursor=<messageId>&limit=50`
- Verify access before returning; filter out soft-deleted messages (show placeholder)

### Task 5.3 — Edit message (WebSocket + REST)
- `PUT /api/messages/:id` — verify author; update `content`; set `editedAt`
- Emit `message:edited` to room/dialog channel

### Task 5.4 — Delete message
- Author or room admin: set `deletedAt` (soft delete)
- Emit `message:deleted` to channel

### Task 5.5 — Typing indicators
- `typing:start` / `typing:stop` — relay to channel (except sender); no DB write
- Auto-expire: server emits `typing:stop` after 5s if no further `typing:start`

---

## 6. Attachments

### Task 6.1 — Upload `POST /api/attachments`
- `multipart/form-data` with field `file` and optional `comment`
- Multer middleware: enforce size limits (20 MB general, 3 MB for images by mime type)
- Store at `uploads/<userId>/<uuid>/<originalname>`
- Create `Attachment` row with `messageId: null` initially (linked on message:send)
- Return `{ id, filename, size, mimeType }`

### Task 6.2 — Download `GET /api/attachments/:id`
- Look up attachment → get message → check if room/dialog message
- For room: verify current user is an active member (not banned)
- For DM: verify current user is one of the two participants and not banned
- Stream file from disk with correct `Content-Disposition` and `Content-Type`

### Task 6.3 — Orphan cleanup job
- Cron job (every hour): delete `Attachment` rows with `messageId IS NULL` older than 24h
- Delete associated files from disk

---

## 7. Notifications

### Task 7.1 — Unread counts
- Maintain `UnreadCount` in-memory per `(userId, roomId|dialogId)` OR store in DB
- Increment when a message is delivered to an offline/unfocused user
- Reset via `POST /api/notifications/read` `{ roomId?, dialogId? }` (called when user opens a chat)
- On connection: send current unread map to newly connected socket via `notification:unread`

---

## 8. Security & Validation

### Task 8.1 — Input validation middleware
- All POST/PUT bodies pass through Zod schemas; return 422 with field-level errors

### Task 8.2 — Rate limiting
- Use `express-rate-limit`: 100 req/min per IP on API; stricter on auth routes (10/min)

### Task 8.3 — Helmet & CORS
- `helmet()` with sensible defaults
- CORS: allow only `CLIENT_ORIGIN` env var

### Task 8.4 — File type validation
- Validate mime type server-side (use `file-type` npm package, not just extension)

---

## 9. Advanced — Jabber / XMPP Federation (Section 6)

### Task 9.1 — ejabberd integration
- Install ejabberd locally (not via Docker):
  - Windows: download the installer from https://www.ejabberd.im/download/ (choose the Windows binary)
  - macOS: `brew install ejabberd`
  - Linux: `sudo apt install ejabberd` or download from https://www.ejabberd.im/download/
- Configure ejabberd external authentication pointing to `/api/jabber/auth` endpoint
- Implement `/api/jabber/auth` endpoint (basic HTTP auth bridge to app DB)
- Users authenticate to ejabberd with their app username + password

### Task 9.2 — XMPP client library
- Install `@xmpp/client` in server
- Create `jabber/bridge.ts` service:
  - Connects to local ejabberd as a bot/component
  - Listens for incoming messages and stores them in `Message` table
  - Sends messages received via WebSocket to ejabberd when target is a Jabber user

### Task 9.3 — Federation (server-to-server)
- Configure ejabberd `s2s` (server-to-server) in `ejabberd.yml`
- Run two local ejabberd instances on different ports to simulate federation:
  - Instance A: domain `chat-a.local`, XMPP port 5222, S2S port 5269
  - Instance B: domain `chat-b.local`, XMPP port 5322, S2S port 5369
  - Add both domains to `/etc/hosts`: `127.0.0.1 chat-a.local chat-b.local`
- Each instance has its own config file: `ejabberd-a.yml`, `ejabberd-b.yml`
- Start scripts: `scripts/start-federation.sh` — launches both ejabberd instances and both Node servers
- Document setup steps in `docs/federation.md`

### Task 9.4 — Admin UI endpoints (for frontend Jabber panels)
- `GET /api/admin/jabber/connections` — active XMPP client connections (from ejabberd REST API)
- `GET /api/admin/jabber/federation` — S2S route info + message counters (from ejabberd REST API)

### Task 9.5 — Load test script
- Create `scripts/loadtest-federation.ts` using `@xmpp/client`
- Spawns 50 virtual users on server-A, 50 on server-B
- Each user sends one message per second to a user on the opposite server for 2 minutes
- Reports: messages sent, received, latency p50/p95/p99
- Run via: `npx ts-node scripts/loadtest-federation.ts`

---

## 10. Testing

### Task 10.1 — Unit tests
- Auth service: registration, login, token rotation
- Presence state machine: multi-socket scenarios
- Room access control: membership, ban, admin checks

### Task 10.2 — Integration tests
- Use `supertest` + test Postgres DB
- Cover: register → login → create room → send message → paginate history → delete account cleanup

### Task 10.3 — Socket tests
- Use `socket.io-client` in Jest
- Test: heartbeat → presence propagation, message delivery, typing relay

---

## Acceptance Criteria Checklist

- [ ] All REST endpoints return correct status codes and JSON shapes
- [ ] WebSocket events delivered to correct recipients only
- [ ] Presence: online/AFK/offline transitions work across multiple tabs (manual test)
- [ ] File download blocked after room ban
- [ ] Owner cannot leave room; can delete
- [ ] Cascade deletes work: delete room → files removed from disk
- [ ] Messages ≤ 3 KB enforced; larger payload returns 422
- [ ] Rate limiting active on auth endpoints
- [ ] `npm run dev` in backend/ starts cleanly against local `chat-ai` database with no errors
