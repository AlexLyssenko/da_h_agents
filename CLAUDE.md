# CLAUDE.md — Chat Application

This file is the primary guidance document for Claude CLI working on this project.
Read it fully before doing anything else. It describes the project layout, the available
slash commands, and every setup step required before writing or running any code.

---

## Project Overview

A full-stack web chat application with:
- **Backend**: Node.js 20, Express, Socket.io, Prisma ORM, PostgreSQL 15
- **Frontend**: React 18, Vite, TailwindCSS, Zustand, React Query, Socket.io-client
- **Database**: PostgreSQL 15 running locally, database name `chat-ai`
- **Advanced (optional)**: ejabberd XMPP / Jabber federation

Detailed architecture, database schema, REST endpoints, and WebSocket events are in:
```
.claude/commands/ARCHITECTURE.md
```

Backend implementation tasks are in:
```
.claude/commands/BACKEND_AGENT_TASKS.md
```

Frontend implementation tasks are in:
```
.claude/commands/FRONTEND_AGENT_TASKS.md
```

Always read the relevant task file AND `ARCHITECTURE.md` before starting work on any task.

---

## Repository Layout

```
/                                 ← repo root
├── CLAUDE.md                     ← this file
│
├── backend/                      ← Node.js server (referred to as "server" in task files)
│   ├── src/
│   │   ├── index.ts
│   │   ├── config/
│   │   ├── routes/
│   │   ├── socket/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── utils/
│   │   └── jobs/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── uploads/                  ← local file storage (gitignored)
│   ├── .env                      ← created from .env.example
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│
├── frontend/                     ← React client (referred to as "client" in task files)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   ├── store/
│   │   ├── hooks/
│   │   ├── components/
│   │   └── pages/
│   ├── .env                      ← created from .env.example
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│
└── .claude/
    └── commands/
        ├── ARCHITECTURE.md
        ├── BACKEND_AGENT_TASKS.md
        └── FRONTEND_AGENT_TASKS.md
```

> **Note on naming**: task files use `server/` and `client/` as directory names. The
> actual folders in this repo are `backend/` and `frontend/`. Treat them as identical.

---

## Prerequisites — Install Before Running Claude CLI

These must be on the host machine before Claude CLI can do anything useful.
Run these checks first and install anything missing.

### 1. Node.js 20+
```powershell
node --version          # must be v20.x or higher
```
If missing or older, download the LTS installer from https://nodejs.org and run it.
Alternatively with winget:
```powershell
winget install OpenJS.NodeJS.LTS
```
After install, close and reopen your terminal so the new PATH takes effect.

### 2. npm 10+ (ships with Node 20)
```powershell
npm --version           # must be 10.x or higher
```

### 3. Git
```powershell
git --version
```
If missing: `winget install Git.Git` or download from https://git-scm.com.

### 4. PostgreSQL 15 running locally
Download and install from https://www.postgresql.org/download/windows/ (use the EDB installer).
During install, note the superuser password you set — you will need it for the `DATABASE_URL`.

Verify it is running:
```powershell
pg_isready -h localhost -p 5432   # must print "accepting connections"
```
If PostgreSQL is not running, start it from **Services** (`services.msc`) — look for
`postgresql-x64-15` — or use pgAdmin, or from an elevated PowerShell:
```powershell
Start-Service -Name "postgresql-x64-15"
```

`psql` must be on your PATH. The EDB installer adds it automatically; if not, add
`C:\Program Files\PostgreSQL\15\bin` to your user PATH manually.

### 5. Database `chat-ai` must exist
```powershell
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='chat-ai';"
# If the row is not returned, create it:
psql -U postgres -c "CREATE DATABASE ""chat-ai"";"
```
You will be prompted for your postgres superuser password.

---

## One-Time Project Setup

Run these steps once after cloning. Claude CLI should run them automatically when
bootstrapping from scratch; a human should run them when setting up a dev machine.

### Step 1 — Create backend environment file
```powershell
cd backend
copy .env.example .env
```

Open `backend\.env` in any text editor and set:
```env
DATABASE_URL="postgresql://postgres:<your-pg-password>@localhost:5432/chat-ai"
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
PORT=4000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_BYTES=20971520
MAX_IMAGE_SIZE_BYTES=3145728
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
```

Replace `<your-pg-password>` with the password you set during PostgreSQL installation.

Generate JWT secrets — run this in PowerShell and paste the output into `.env`:
```powershell
# PowerShell — generate two 32-byte hex secrets
[System.BitConverter]::ToString((1..32 | ForEach-Object { [byte](Get-Random -Max 256) })).Replace("-","").ToLower()
# Run the above line twice: once for JWT_ACCESS_SECRET, once for JWT_REFRESH_SECRET
```

Or if you have Git Bash / WSL available:
```bash
openssl rand -hex 32   # run twice
```

### Step 2 — Create frontend environment file
```powershell
cd frontend
copy .env.example .env
```

`frontend/.env` content:
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

### Step 3 — Install backend dependencies
```powershell
cd backend
npm install
```

### Step 4 — Install frontend dependencies
```powershell
cd frontend
npm install
```

### Step 5 — Run Prisma migrations
```powershell
cd backend
npx prisma migrate dev --name init
```

If the schema already has migrations and you just need to sync:
```powershell
npx prisma migrate deploy
```

### Step 6 — Seed the database (optional but recommended)
```powershell
cd backend
npx prisma db seed
# Creates: 1 admin user, 2 sample public rooms
```

### Step 7 — Create uploads directory
```powershell
mkdir backend\uploads
```

---

## Running the Application

### Development mode (hot reload)

Ensure local PostgreSQL is running and the `chat-ai` database exists before starting.
Open two separate PowerShell (or Windows Terminal) windows:

Window 1 — Backend:
```powershell
cd backend
npm run dev
# Starts ts-node-dev on port 4000
```

Window 2 — Frontend:
```powershell
cd frontend
npm run dev
# Starts Vite dev server on port 5173
```

Open: http://localhost:5173

### Production build (local)
```powershell
# Backend
cd backend
npm run build
npm run start

# Frontend
cd frontend
npm run build
npm run preview    # preview at http://localhost:4173
```

### Federation mode (Jabber — advanced)
Requires ejabberd installed locally. See Task 9.3 in `BACKEND_AGENT_TASKS.md`.

---

## Slash Commands

These commands are available in Claude CLI via `.claude/commands/`. Invoke them with
`/` in the Claude CLI prompt.

| Command | File | When to use |
|---|---|---|
| `/ARCHITECTURE` | `ARCHITECTURE.md` | Read first — DB schema, API table, WS events |
| `/BACKEND_AGENT_TASKS` | `BACKEND_AGENT_TASKS.md` | Working on `backend/` code |
| `/FRONTEND_AGENT_TASKS` | `FRONTEND_AGENT_TASKS.md` | Working on `frontend/` code |

**Usage pattern in Claude CLI:**
```
/ARCHITECTURE
# Claude reads the architecture, then you give a task:
Implement Task 1.2 — Login endpoint
```

---

## Common Claude CLI Workflows

### Start a backend task
```
/BACKEND_AGENT_TASKS
Implement Task 2.1 — Presence store and Task 2.2 — Socket auth handshake
```

### Start a frontend task
```
/FRONTEND_AGENT_TASKS
Implement Task 3.1 — AppShell layout and Task 3.3 — Sidebar
```

### Fix a failing test
```
/ARCHITECTURE
The test for Task 1.3 (token refresh) is failing. Here is the error:
<paste error>
```

### Add a new feature end-to-end
```
/ARCHITECTURE
/BACKEND_AGENT_TASKS
/FRONTEND_AGENT_TASKS
Implement the full file attachment flow: Task 6.1 (upload), Task 6.2 (download),
and frontend Task 4.8 (AttachmentPreview component)
```

---

## Development Rules for Claude CLI

These rules apply to every code change made in this project.

### General
- Always read `ARCHITECTURE.md` before implementing any endpoint or component.
- Never invent API shapes — all contracts are defined in `ARCHITECTURE.md`.
- Folder name mapping: `backend/` = `server/`, `frontend/` = `client/`.
- Never commit secrets or `.env` files.
- Always run `npm run lint` and `npm run typecheck` after changes.

### Backend rules
- All route handlers must go through the `requireAuth` middleware unless explicitly public.
- All request bodies must be validated with a Zod schema before processing.
- All Prisma queries go through `src/services/`, not directly in route handlers.
- File paths for uploads must always use `path.join(UPLOAD_DIR, ...)` — no string concatenation.
- Never expose `passwordHash` in any API response.
- Use `async/await` with explicit try/catch or an `asyncHandler` wrapper; no unhandled promise rejections.
- Socket event handlers live in `src/socket/`; import services from `src/services/`.

### Frontend rules
- All API calls go through `src/api/` modules — never call `axios`/`fetch` directly in components.
- State that is shared across multiple components goes in a Zustand store.
- Server data (rooms, messages, friends) is managed by React Query — not local `useState`.
- Socket event subscriptions must be cleaned up in `useEffect` return functions.
- Never store the `accessToken` in `localStorage` or `sessionStorage` — keep it in Zustand memory only.
- Always show a loading skeleton or spinner while async data is being fetched.
- Tailwind only — no inline `style` props except for dynamic values that Tailwind cannot handle.

### Database rules
- Every schema change requires a new Prisma migration: `npx prisma migrate dev --name <name>`.
- Never use `prisma db push` in anything other than a throwaway local environment.
- Migrations must be committed to the repository alongside the code that needs them.

---

## Useful Commands Reference

```powershell
# Backend (run from backend\ directory)
npm run dev                          # start with hot reload
npm run build                        # compile TypeScript
npm run start                        # run compiled output
npm run lint                         # ESLint
npm run typecheck                    # tsc --noEmit
npm test                             # Jest
npx prisma studio                    # visual DB browser at localhost:5555
npx prisma migrate dev --name <x>    # create new migration
npx prisma migrate reset             # wipe DB and re-run all migrations (dev only)
npx prisma db seed                   # run seed script

# Frontend (run from frontend\ directory)
npm run dev                          # Vite dev server (port 5173)
npm run build                        # production bundle → dist/
npm run preview                      # preview production build locally
npm run lint                         # ESLint
npm run typecheck                    # tsc --noEmit

# PostgreSQL (PowerShell)
pg_isready -h localhost -p 5432      # check if Postgres is accepting connections
psql -U postgres -d chat-ai          # open psql shell on the chat-ai database
psql -U postgres -c "\l"             # list all databases

# Start/stop PostgreSQL service (run PowerShell as Administrator)
Start-Service  -Name "postgresql-x64-15"
Stop-Service   -Name "postgresql-x64-15"
Get-Service    -Name "postgresql-x64-15"
# Or use Services GUI: Win+R → services.msc → find postgresql-x64-15
```

---

## Environment Variables Reference

### backend/.env.example
```env
DATABASE_URL=postgresql://postgres@localhost:5432/chat-ai
JWT_ACCESS_SECRET=changeme
JWT_REFRESH_SECRET=changeme
PORT=4000
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_BYTES=20971520
MAX_IMAGE_SIZE_BYTES=3145728
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
# Optional: Jabber
EJABBERD_API_URL=http://localhost:5280/api
EJABBERD_ADMIN_USER=admin
EJABBERD_ADMIN_PASS=changeme
EJABBERD_DOMAIN=localhost
```

### frontend/.env.example
```env
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=http://localhost:4000
```

---

## Troubleshooting

### "Cannot connect to database"
```powershell
# Check Postgres is running
pg_isready -h localhost -p 5432

# Start the service (run PowerShell as Administrator)
Start-Service -Name "postgresql-x64-15"

# Or open Services GUI: Win+R → services.msc → start postgresql-x64-15

# Verify the database exists
psql -U postgres -c "\l"
# If chat-ai is missing:
psql -U postgres -c "CREATE DATABASE ""chat-ai"";"

# Then retry migrations
cd backend; npx prisma migrate deploy
```

### "Port 4000 already in use"
```powershell
# Find and kill the process using port 4000
$port = 4000
$pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### "Port 5173 already in use"
```powershell
$port = 5173
$pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
if ($pid) { Stop-Process -Id $pid -Force }
```

### Prisma client out of sync after schema change
```powershell
cd backend
npx prisma generate
```

### Uploads directory missing
```powershell
mkdir backend\uploads
```

### `npx prisma` fails with "spawn EINVAL" or script execution error
PowerShell's default execution policy blocks scripts. Fix with:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```
Then retry the npx command.

### Frontend can't reach backend (CORS error)
Verify `CLIENT_ORIGIN` in `backend\.env` exactly matches the origin shown in the browser
(including protocol and port). Restart the backend after changing `.env`.

### Token refresh loop / infinite 401s
Clear browser cookies for `localhost`, then log in again. This clears a stale refresh token.
