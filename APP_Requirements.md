# Online Chat Server — Requirements

## 1. Introduction

Web-based chat application supporting:
- User registration & authentication
- Public/private chat rooms
- One-to-one messaging
- Contacts/friends system
- File & image sharing
- Moderation/admin features
- Persistent message history

**Scale target:** up to 300 concurrent users

---

## 2. Functional Requirements

### 2.1 User Accounts & Authentication

#### Registration
- Email (unique)
- Username (unique, immutable)
- Password

#### Authentication
- Email + password login
- Logout (current session only)
- Persistent login across sessions

#### Password Management
- Reset password
- Change password
- Secure hashing required

#### Account Deletion
- Deletes owned rooms
- Removes user from other rooms
- Deletes content only in owned rooms

---

### 2.2 User Presence & Sessions

#### Presence States
- Online
- AFK (>1 min inactivity)
- Offline (all tabs closed)

#### Multi-tab Rules
- Any active tab → online
- All inactive → AFK
- All closed → offline

#### Sessions
- View active sessions
- Logout specific sessions

---

### 2.3 Contacts / Friends

- Friend list per user
- Send requests (username or room)
- Confirmation required
- Remove friends
- User-to-user ban:
    - Blocks communication
    - Freezes chat history

**Messaging allowed only if:**
- Users are friends
- No bans exist

---

### 2.4 Chat Rooms

#### Properties
- Name (unique)
- Description
- Visibility (public/private)
- Owner, admins, members
- Ban list

#### Public Rooms
- Visible in catalog
- Searchable
- Free to join

#### Private Rooms
- Invite-only
- Not visible publicly

#### Roles

**Admin:**
- Delete messages
- Ban/remove users
- Manage admins

**Owner:**
- Full control
- Cannot lose admin role
- Can delete room

#### Room Rules
- Leaving allowed (except owner)
- Removal = ban
- Banned users cannot rejoin

#### Deletion
- Deletes all messages & files permanently

---

### 2.5 Messaging

#### Features
- Text (UTF-8, max 3KB)
- Multiline
- Emoji
- Attachments
- Replies

#### Actions
- Edit (with “edited” label)
- Delete (author/admin)

#### Behavior
- Chronological order
- Infinite scroll
- Offline delivery

---

### 2.6 Attachments

#### Supported
- Images
- Any file types

#### Upload
- Button
- Copy-paste

#### Constraints
- File ≤ 20MB
- Image ≤ 3MB

#### Access
- Only current participants
- Lost access → no file access

---

### 2.7 Notifications

- Unread indicators (rooms & chats)
- Cleared on open
- Presence updates < 2s latency

---

## 3. Non-Functional Requirements

### Capacity
- 300 concurrent users
- 1000 users per room
- Unlimited rooms per user

### Performance
- Message delivery ≤ 3s
- Presence update ≤ 2s
- Handle 10,000+ messages per room

### Persistence
- Long-term storage
- Infinite scroll support

### File Storage
- Local filesystem

### Sessions
- No auto logout
- Multi-tab support

### Reliability
- Consistent:
    - Membership
    - Bans
    - Permissions
    - Message history

---

## 4. UI Requirements

### Layout
- Top menu
- Chat center
- Input bottom
- Sidebar (rooms/contacts)
- Member list

### Chat Behavior
- Auto-scroll (if at bottom)
- No forced scroll when reading history
- Infinite scroll

### Input Features
- Multiline
- Emoji
- Attachments
- Reply support

### Admin UI
- Modal-based actions:
    - Ban/unban
    - Remove users
    - Manage admins
    - Delete room/messages

---

## 5. Key Rules

- Email & username are unique
- Username immutable
- Room names unique
- Public rooms searchable
- Private rooms invite-only
- Personal chats = 2 users only
- Room deletion removes all content
- File persists unless room deleted
- Offline = no open tabs
- Logout affects only current session
