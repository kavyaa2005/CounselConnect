# CounselConnect — Setup & Run Guide

## Prerequisites

- Node.js 18+
- pnpm (for the frontend) — install with `npm install -g pnpm`

---

## 1. Install Dependencies

### Frontend
```bash
# In the project root
pnpm install
```

### Backend
```bash
cd backend
npm install
```

---

## 2. Environment Variables

Both `.env` files are already created. Verify they exist:

**Project root `.env`** (frontend):
```
VITE_API_URL=http://localhost:5000/api
```

**`backend/.env`**:
```
PORT=5000
JWT_SECRET=counselconnect_jwt_secret_key_2026_very_secure
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> **Production tip:** Change `JWT_SECRET` to a long random string before deploying.

---

## 3. Run the App

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev       # with nodemon (auto-restart on changes)
# or
npm start         # plain node
```
Backend runs at: `http://localhost:5000`  
Health check: `http://localhost:5000/api/health`

**Terminal 2 — Frontend:**
```bash
pnpm dev
```
Frontend runs at: `http://localhost:5173`

---

## 4. First-Time Use

1. Open `http://localhost:5173`
2. Click **Get Started** → complete the 4-step onboarding
3. You're in — all features are live

---

## 5. API Overview

| Route | Description |
|---|---|
| `POST /api/auth/register` | Create account |
| `POST /api/auth/login` | Login, returns JWT |
| `POST /api/auth/logout` | Invalidate token |
| `GET  /api/auth/me` | Get current user |
| `GET  /api/counselors` | List counselors |
| `POST /api/appointments` | Book a session |
| `POST /api/mood` | Log mood (1–5) |
| `GET  /api/mood/stats` | Mood stats + streak |
| `GET/POST/PUT/DELETE /api/journal` | Journal CRUD |
| `GET  /api/messages/conversations` | Chat list |
| `POST /api/messages/send` | Send message |
| `POST /api/ai/match` | Counselor matching quiz |
| `GET  /api/ai/summary` | AI wellness summary |
| `GET  /api/journey` | Journey timeline |
| `GET  /api/notifications` | Notifications |

All routes except register/login require `Authorization: Bearer <token>`.

---

## 6. Data Storage

Mock data is stored as JSON files in `backend/data/`:

```
backend/data/
  users.json         ← registered users
  moods.json         ← mood log entries
  journal.json       ← journal entries
  appointments.json  ← booked sessions
  messages.json      ← chat messages (keyed by userId)
  notifications.json ← notifications
  counselors.json    ← static counselor profiles (seed data)
```

To reset all user data, clear the arrays in each file:
```bash
cd backend/data
echo "[]" > users.json moods.json journal.json appointments.json notifications.json
echo "{}" > messages.json
```

---

## 7. Swapping to a Real Database

Each service file (`backend/services/*.service.js`) reads/writes via `fileStore.utils.js`. To migrate:

1. Replace `readStore` / `writeStore` calls with your ORM/DB queries
2. No controller, route, or middleware changes needed
3. Update `backend/models/README.md` schemas to your DB schema

---

## 8. File Upload (Profile Photos)

Uploaded photos are saved to `backend/uploads/`. The folder is created automatically on first upload. Served at `http://localhost:5000/uploads/<filename>`.

---

## Project Structure

```
Major Project/
├── src/                          ← React + TypeScript frontend
│   └── app/
│       ├── context/AuthContext.tsx
│       ├── lib/api.ts            ← HTTP client
│       ├── lib/auth.ts           ← localStorage helpers
│       └── components/pages/    ← All page components
├── backend/
│   ├── routes/                  ← Express route definitions
│   ├── controllers/             ← Request handlers
│   ├── services/                ← Business logic
│   ├── middleware/              ← Auth, validation, error handling
│   ├── utils/                   ← JWT, bcrypt, file store, response
│   ├── config/                  ← App config, CORS config
│   ├── data/                    ← JSON mock database
│   ├── models/README.md         ← DB schema reference
│   ├── app.js                   ← Express app setup
│   └── server.js                ← HTTP server entry point
├── .env                         ← Frontend env (VITE_API_URL)
└── backend/.env                 ← Backend env (PORT, JWT_SECRET, ...)
```
