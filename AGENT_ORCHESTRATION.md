# Agent Orchestration Strategy — Chat Application

This document describes how to implement the pending features in `PENDING_FEATURES.md`
using **parallel Claude agent orchestration** — multiple specialized agents working
concurrently, coordinated through shared contracts.

---

## Why Agent Orchestration?

The pending work splits cleanly along two independent axes:
- **Backend agent** — Node.js, Express, Prisma, Socket.IO
- **Frontend agent** — React, Zustand, React Query, Tailwind

These axes rarely touch the same files. The only shared surface is the API contract
defined in `.claude/commands/ARCHITECTURE.md`. Orchestrating two parallel agents
against that contract lets you implement both sides simultaneously without merge
conflicts or coordination overhead.

---

## Mental Model

```
                         ┌─────────────────────┐
                         │  Orchestrator (you)  │
                         │  Claude CLI session  │
                         └──────────┬──────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │  Backend Agent   │  │ Frontend Agent   │  │   Test Agent     │
   │  (worktree-b)    │  │  (worktree-f)    │  │  (worktree-t)    │
   │                  │  │                  │  │                  │
   │ backend/ only    │  │ frontend/ only   │  │ *.test.ts only   │
   └──────────────────┘  └──────────────────┘  └──────────────────┘
              │                     │                     │
              └─────────────────────┴─────────────────────┘
                                    │
                        ARCHITECTURE.md (shared contract)
                        never modified by sub-agents
```

**Rules:**
1. Each agent works inside its own git worktree — no overlapping file writes.
2. `ARCHITECTURE.md` is read-only for all sub-agents. Any contract change must be
   approved by the orchestrator first, then re-distributed.
3. Agents communicate via file outputs and git branches — not directly to each other.

---

## Tooling: How to Invoke Parallel Agents in Claude CLI

Use the `Agent` tool inside a single message to launch multiple agents concurrently.
Each call to `Agent` with `isolation: "worktree"` gets its own branch copy of the repo.

```
// In one Claude CLI message (pseudo-code):
Agent({ subagent_type: "BACKEND_AGENT_TASKS", isolation: "worktree", ... })
Agent({ subagent_type: "FRONTEND_AGENT_TASKS", isolation: "worktree", ... })
```

Both launch immediately and run in parallel. The orchestrator waits for both to
complete, reviews diffs, then merges.

---

## Phase Plan

### Phase 0 — Contract Update (5 min, orchestrator only)

Before spawning any agents, update `ARCHITECTURE.md` to document the two missing
contract items so both agents share the same ground truth:

1. Add `isAdmin: boolean` to the `User` object shape in the REST response tables.
2. Add the two new password-reset endpoints to the endpoint table:
   - `POST /api/auth/password/reset`
   - `PUT /api/auth/password/reset/confirm`

> Do this yourself in the main session — not via a sub-agent.

---

### Phase 1 — Core Gaps (run Backend + Frontend agents in parallel)

Launch both agents in a single message:

#### Backend Agent — Prompt

```
You are the backend agent for a Node.js/Express/Prisma chat application.
Read .claude/commands/ARCHITECTURE.md and .claude/commands/BACKEND_AGENT_TASKS.md
before doing anything.

Working directory: backend/

Implement these two pending items in order:

1. User.isAdmin field (PENDING_FEATURES.md §2)
   - Add `isAdmin Boolean @default(false)` to the User model in prisma/schema.prisma
   - Run: npx prisma migrate dev --name add-user-isadmin
   - Update src/services/auth.ts so login and refresh responses include isAdmin
   - Update any Zod response schemas that shape the user object

2. Password-reset backend (already exists; verify it works correctly per Task 1.7)
   - POST /api/auth/password/reset  — accepts { email }, always 200, logs token to console
   - PUT /api/auth/password/reset/confirm — validates token, updates passwordHash
   - Confirm Zod validation is in place on both endpoints

After each change run: npm run lint && npm run typecheck
Do not touch frontend/ or ARCHITECTURE.md.
```

#### Frontend Agent — Prompt

```
You are the frontend agent for a React/Vite/TailwindCSS chat application.
Read .claude/commands/ARCHITECTURE.md and .claude/commands/FRONTEND_AGENT_TASKS.md
before doing anything.

Working directory: frontend/

Implement these two pending items:

1. Password-reset UI (PENDING_FEATURES.md §1)
   Create frontend/src/pages/ForgotPasswordPage.tsx
     - Single email input form
     - Calls POST /api/auth/password/reset via src/api/auth.ts
     - On success: show "Check your console for the reset token" message
       (development-only flow — no real email)
   Create frontend/src/pages/ResetPasswordPage.tsx
     - Reads ?token= from query string
     - New password + confirm password fields
     - Calls PUT /api/auth/password/reset/confirm
     - On success: redirect to /login
   Edit frontend/src/App.tsx
     - Add <GuestRoute path="/forgot-password"> → ForgotPasswordPage
     - Add <GuestRoute path="/reset-password"> → ResetPasswordPage
   Edit frontend/src/pages/LoginPage.tsx
     - Add "Forgot password?" link below the form

2. Admin route guard (PENDING_FEATURES.md §2)
   Edit frontend/src/store/authStore.ts
     - Add isAdmin: boolean to the User type
   Edit frontend/src/App.tsx
     - The /admin route must redirect to / if user.isAdmin is false

After each change run: npm run lint && npm run typecheck
Do not touch backend/ or ARCHITECTURE.md.
```

**Merge strategy after Phase 1:**
```bash
git merge worktree-backend-phase1
git merge worktree-frontend-phase1
npx prisma migrate deploy   # apply the new migration
```

---

### Phase 2 — Jabber Integration (run Backend + Frontend agents in parallel)

Both agents depend on the admin endpoints being defined. Update ARCHITECTURE.md first
to add the two Jabber admin endpoints, then launch:

#### Backend Agent — Prompt

```
Implement Jabber/XMPP integration for the chat backend.
Read .claude/commands/ARCHITECTURE.md and .claude/commands/BACKEND_AGENT_TASKS.md
(Tasks 9.1–9.4) before starting.

Working directory: backend/

Step 1 — ejabberd auth bridge (Task 9.1)
  - Create src/routes/jabber.ts with POST /api/jabber/auth
  - Endpoint receives { user, server, password } from ejabberd extauth
  - Validate against DB using bcrypt; return { result: "allow" | "deny" }
  - Register route in src/index.ts (no requireAuth — ejabberd calls this directly)
  - Create backend/ejabberd.yml with extauth config pointing to this endpoint

Step 2 — XMPP bridge service (Task 9.2)
  - npm install @xmpp/client
  - Create src/services/jabber/bridge.ts
    - connectBridge(): connects to local ejabberd as admin bot
    - onIncomingXmpp(stanza): saves message to DB using messagesService
    - forwardToXmpp(userId, content): sends stanza to ejabberd
  - Start bridge in src/index.ts after DB is ready (non-fatal: log error if ejabberd not running)

Step 3 — Admin API endpoints (Task 9.4)
  - GET /api/admin/jabber/connections — proxy GET http://localhost:5280/api/connected_users
  - GET /api/admin/jabber/federation — proxy GET http://localhost:5280/api/stats
  - Both routes require requireAuth + user.isAdmin === true

Step 4 — Federation configs (Task 9.3)
  - Create ejabberd-a.yml (domain chat-a.local, port 5222/5269)
  - Create ejabberd-b.yml (domain chat-b.local, port 5322/5369)
  - Create scripts/start-federation.sh

Run npm run lint && npm run typecheck after each step.
Do not touch frontend/ or ARCHITECTURE.md.
```

#### Frontend Agent — Prompt

```
Implement the Jabber admin UI for the chat frontend.
Read .claude/commands/ARCHITECTURE.md and .claude/commands/FRONTEND_AGENT_TASKS.md
(Tasks 9.1–9.3) before starting.

Working directory: frontend/

Step 1 — API functions
  - In src/api/admin.ts add:
    getJabberConnections(): GET /api/admin/jabber/connections
    getFederationStats():   GET /api/admin/jabber/federation

Step 2 — JabberDashboard component (Task 9.2)
  Create src/components/admin/JabberDashboard.tsx
  - useQuery with refetchInterval: 5000
  - Table columns: JID, Resource, IP, Connected Since, Presence
  - Summary bar: Total | Online | AFK

Step 3 — FederationStats component (Task 9.3)
  Create src/components/admin/FederationStats.tsx
  - useQuery with refetchInterval: 5000
  - S2S routes table: From-Domain, To-Domain, State, Established Since
  - Messages-today counter + CSS-only horizontal bar chart
  - Manual "Refresh" button that calls refetch()

Step 4 — Wire into AdminPage (Task 9.1)
  Edit src/pages/AdminPage.tsx
  - Replace current content with two tabs: "Jabber Connections" | "Federation Traffic"
  - Render <JabberDashboard> or <FederationStats> based on active tab

Run npm run lint && npm run typecheck after each step.
Do not touch backend/ or ARCHITECTURE.md.
```

---

### Phase 3 — Test Suite (Test Agent, runs after Phase 1 merges)

```
You are the test agent for a Node.js/Express/Prisma chat backend.
Read .claude/commands/ARCHITECTURE.md and .claude/commands/BACKEND_AGENT_TASKS.md
(Tasks 10.1–10.3) before starting.

Working directory: backend/

Step 0 — Dependencies
  npm install -D jest ts-jest supertest @types/jest @types/supertest
  Add jest config to package.json:
    "jest": { "preset": "ts-jest", "testEnvironment": "node",
              "testMatch": ["**/__tests__/**/*.test.ts"] }
  Add script: "test": "jest"

Step 1 — Unit tests (Task 10.1)
  src/services/__tests__/auth.test.ts
    - register: valid, duplicate email, duplicate username
    - login: valid, wrong password, unknown email
    - token rotation: refresh issues new token, old one is revoked
  src/services/__tests__/presence.test.ts
    - single socket: connect → ONLINE, disconnect → OFFLINE
    - multi-socket: two sockets → ONLINE, one disconnects → stays ONLINE,
      last disconnects → OFFLINE, all afk → AFK
  src/services/__tests__/rooms.test.ts
    - non-member cannot post to private room
    - banned user cannot re-join
    - non-admin cannot kick member

Step 2 — Integration tests (Task 10.2)
  Use supertest against a real test DB (DATABASE_URL_TEST env var).
  src/__tests__/integration/flow.test.ts
    Full flow: register → login → create room → send message (via REST stub) →
    paginate messages → delete account → verify cascade (room gone, messages gone)

Step 3 — Socket tests (Task 10.3)
  src/__tests__/socket/presence.test.ts
    - connect with valid token → receives presence:update ONLINE
    - send heartbeat afk → receives presence:update AFK
    - disconnect → receives presence:update OFFLINE for other connected sockets
  src/__tests__/socket/messaging.test.ts
    - message:send to room → all room members receive message:new
    - typing:start → all OTHER members receive typing event (sender does not)

Run npm test after all files are written; fix any failures before completing.
```

---

### Phase 4 — Load-Test Script (Backend Agent solo, after Phase 2)

```
You are the backend agent.
Working directory: backend/

Implement the federation load-test script (Task 9.5):
Create scripts/loadtest-federation.ts

- Uses @xmpp/client (already installed from Phase 2)
- Spawns 50 virtual users connecting to chat-a.local:5222
  and 50 virtual users connecting to chat-b.local:5322
- Each user sends one message per second to a random user on the OPPOSITE server
  for 120 seconds
- Collects per-message round-trip latency (send timestamp → message:new receipt)
- After run: prints messages sent, received, lost, latency p50/p95/p99

Run with: npx ts-node scripts/loadtest-federation.ts
```

---

## Orchestrator Checklist

Use this in the main Claude CLI session to track parallel work:

```
Phase 0 (you)
  [ ] Update ARCHITECTURE.md — isAdmin field in User response shape
  [ ] Update ARCHITECTURE.md — password-reset endpoints

Phase 1 (parallel)
  [ ] Backend agent: isAdmin migration + verify password-reset endpoints
  [ ] Frontend agent: ForgotPasswordPage + ResetPasswordPage + admin guard
  [ ] Review & merge both branches
  [ ] Run: npx prisma migrate deploy

Phase 2 (parallel, after Phase 1)
  [ ] Update ARCHITECTURE.md — Jabber admin endpoints
  [ ] Backend agent: Tasks 9.1–9.4
  [ ] Frontend agent: Tasks 9.1–9.3
  [ ] Review & merge both branches
  [ ] Smoke test: start ejabberd + backend + frontend; confirm admin panel polls

Phase 3 (after Phase 1)
  [ ] Test agent: Tasks 10.1–10.3
  [ ] Review test output; fix any failures surfaced
  [ ] Merge test branch

Phase 4 (after Phase 2)
  [ ] Backend agent: load-test script (Task 9.5)
  [ ] Run load test; record p50/p95/p99 numbers
```

---

## Conflict Avoidance Rules

| Rule | Why |
|---|---|
| Sub-agents never edit `ARCHITECTURE.md` | Single source of truth — only orchestrator touches it |
| Backend agent only writes in `backend/` | Zero overlap with frontend worktree |
| Frontend agent only writes in `frontend/` | Zero overlap with backend worktree |
| Schema changes land before frontend changes need the new field | Ordering prevents type errors in frontend |
| Each agent runs `lint + typecheck` before reporting done | Catches regressions before merge |

---

## How to Start Right Now

In your Claude CLI session, paste this to kick off Phase 1:

```
/ARCHITECTURE

Launch two parallel agents for Phase 1 of PENDING_FEATURES.md:

Agent 1 (backend) — implement User.isAdmin migration and verify password-reset endpoints
Agent 2 (frontend) — implement ForgotPasswordPage, ResetPasswordPage, admin route guard

Use prompts from AGENT_ORCHESTRATION.md Phase 1. Each agent works only in its own
directory. Both must pass lint + typecheck before finishing.
```
