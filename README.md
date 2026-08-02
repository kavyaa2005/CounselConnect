# CounselConnect

AI-powered mental health counseling and support platform.

Three panels — **User**, **Doctor**, and **Admin** — in one React app, backed by one
Express API with JWT role-based authentication.

## Quick start

```bash
# 1. Install
pnpm install
cd backend && npm install

# 2. Seed demo accounts (first time only)
npm run seed

# 3. Run — two terminals
npm run dev        # terminal 1, in backend/  → http://localhost:5000
pnpm dev           # terminal 2, in root      → http://localhost:5173
```

## Sign in

All three roles use the same page — `http://localhost:5173/login` — and are routed to
their own panel automatically.

| Panel | Email | Password |
|---|---|---|
| Admin | `admin@counselconnect.com` | `Admin@123` |
| Doctor | `sarah.chen@counselconnect.com` | `Doctor@123` |
| User | `farhan@gmail.com` | `User@123` |

## Video calling

Real WebRTC peer-to-peer video between a client and their counselor. Media flows
browser-to-browser; the server only relays the connection setup over Socket.IO.

Access is enforced server-side: a user can only call counselors they've actually
booked or messaged, and a counselor only sees their own clients. To try it, sign
in as two people in two browsers (`farhan@gmail.com` and
`sarah.chen@counselconnect.com`), open **Video Sessions** in both, and call.

## Patient journals

Patients journal in the app and choose per entry whether their counselor can read
it. Counselors see shared entries in **Patient Journals** and can export a branded
**PDF summary**. Private entries are filtered server-side — their text never
reaches the doctor at all.

## Counselor onboarding

Counselors can't self-register. They apply via **Join as Counselor**, upload their
degree and certifications, and an admin reviews the documents in **Admin →
Applications** before approving. Approval creates a verified doctor account they
can sign into immediately. Certificates are stored outside the public folder and
are only readable through an admin-authenticated route.

**See [SETUP.md](./SETUP.md)** for the full credential list, architecture, video
call setup, journal & application flows, admin API reference, and troubleshooting.

## Stack

React 18 · TypeScript · Vite · Tailwind · React Router · Recharts · Motion · WebRTC
Express · Socket.IO · JWT · bcrypt · JSON file store (swappable for a real DB)
