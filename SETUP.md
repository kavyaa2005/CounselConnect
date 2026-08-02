# CounselConnect — Setup, Credentials & Run Guide

A mental-health counseling platform with **three integrated panels** — User, Doctor (Counselor),
and Admin — all served by one React app and one Express API, with role-based authentication.

---

## 1. Prerequisites

- **Node.js 18+**
- **pnpm** for the frontend — install once with `npm install -g pnpm`

---

## 2. Install

```bash
# Frontend (from the project root)
pnpm install

# Backend
cd backend
npm install
```

> If you're updating an existing checkout, re-run both installs. Recent features
> added `socket.io` + `pdfkit` (backend) and `socket.io-client` (frontend).

---

## 3. Seed the demo accounts

This creates the admin accounts and sets known passwords for every user and doctor.
**Run this once before your first login.**

```bash
cd backend
npm run seed
```

It prints the full credential list when it finishes. Safe to re-run at any time — it
resets demo passwords and never deletes moods, journals, or appointments.

---

## 4. Run the app

Open **two terminals**.

**Terminal 1 — Backend**

```bash
cd backend
npm run dev      # nodemon, auto-restarts on change
# or: npm start
```
API runs at `http://localhost:5000` · health check `http://localhost:5000/api/health`

**Terminal 2 — Frontend**

```bash
pnpm dev
```
App runs at `http://localhost:5173`

> Both must be running. If the backend is down, the panels show a "Couldn't load…" message
> instead of data.

---

## 5. Login credentials

**Everyone signs in at the same page: `http://localhost:5173/login`**

Enter the email and password below — the app reads the role from the token and sends you
to the right panel automatically. There is no separate admin or doctor login URL.

### Admin panel → redirects to `/admin`

| Email | Password | Role |
|---|---|---|
| `admin@counselconnect.com` | `Admin@123` | Super Admin |
| `moderator@counselconnect.com` | `Admin@123` | Moderator |

### Doctor panel → redirects to `/doctor`

| Email | Password | Counselor |
|---|---|---|
| `sarah.chen@counselconnect.com` | `Doctor@123` | Dr. Sarah Chen |
| `marcus.wells@counselconnect.com` | `Doctor@123` | Dr. Marcus Wells |
| `amara.osei@counselconnect.com` | `Doctor@123` | Dr. Amara Osei |
| `lisa.park@counselconnect.com` | `Doctor@123` | Dr. Lisa Park |
| `james.rivera@counselconnect.com` | `Doctor@123` | Dr. James Rivera |
| `mei.lin@counselconnect.com` | `Doctor@123` | Dr. Mei Lin |
| `dr.rachel@counselconnect.com` | `Doctor@123` | Dr. Rachel Morgan |

### User panel → redirects to `/dashboard`

| Email | Password | Name |
|---|---|---|
| `farhan@gmail.com` | `User@123` | Farhan |
| `asra@gmail.com` | `User@123` | Asra |
| `fsargath@gmail.com` | `User@123` | Farhan |

New users can also self-register at `/register` — they get the `user` role.

---

## 6. How authentication & authorization work

**Authentication** — `POST /api/auth/login` checks `users.json`, then `doctors.json`, then
`admins.json`. Passwords are bcrypt-hashed (12 rounds). On success the API returns a JWT
carrying `{ id, email, role }`, stored in `localStorage` and attached as
`Authorization: Bearer <token>` on every later request.

**Authorization** — two layers, both enforced:

| Layer | Where | What it does |
|---|---|---|
| Backend | `middleware/auth.middleware.js` | `authenticate` verifies the JWT; `requireRole('admin')` guards every `/api/admin/*` route. A doctor or user token gets **403**; no token gets **401**. |
| Frontend | Route guards in `AdminPanel`, `DoctorPanel`, `DashboardLayout` | Redirects anyone without the right role to their own panel, or to `/login` if signed out. |

Other behaviors wired up:

- **Suspending an account actually locks it out.** Set a user to *Suspended* in the admin
  panel and their next login attempt returns 403.
- **Logout blacklists the token** server-side, so a copied token stops working immediately.
- **Signed-in users can't see `/login`** — they're bounced to their own panel.

---

## 7. Video calling

Real peer-to-peer video using **WebRTC**. Camera and microphone streams go
**directly between the two browsers** — they never pass through the server. The
backend only relays the small setup messages (SDP offer/answer and ICE
candidates) over a Socket.IO connection that shares port 5000 with the REST API.

### Who can call whom

This is enforced on the server, not just hidden in the UI.

A user and a counselor are **connected** once either is true:
1. the user has booked an appointment with that counselor, or
2. they already have a message thread together.

| Panel | Sees | Cannot see |
|---|---|---|
| **User** → Video Sessions | Only their own counselors | Any counselor they've never booked or messaged |
| **Doctor** → Video Sessions | Only their own clients | Other counselors' clients, and other counselors |

Every call invite is re-checked server-side in `realtime/signaling.js`. Trying to
call someone you aren't connected to returns *"You are not connected to this
person."* User-to-user and doctor-to-doctor calls are rejected outright — a call
is always exactly one client and one counselor.

### How to make a call

1. Open the app in **two different browsers** (or one normal + one incognito
   window) so you can be signed in as two people at once.
2. Sign in as `farhan@gmail.com` in one, `sarah.chen@counselconnect.com` in the other.
3. Both go to **Video Sessions**. Each sees the other listed with a green
   "Available now" dot — presence is live.
4. Click the green camera button. The other side rings with an Accept/Decline
   card, **on whatever screen they're on** — they don't have to be sitting on the
   video page.
5. Accept, allow camera access when the browser asks, and you're connected.

In-call you get mute, camera on/off, screen share, a live session timer, and a
chat panel wired to the real message thread. When either side hangs up, the call
is written to history with its duration.

### Requirements & limits

- Browsers only allow camera access on **`https://` or `localhost`**. Use
  `http://localhost:5173` — if you open the app by LAN IP over plain `http`,
  the browser will block the camera and the page tells you so.
- Works on the same machine and across your local network. Calling across the
  open internet would additionally need a TURN server (free STUN is configured;
  TURN is not, since it needs a hosted relay).
- Chrome, Edge, and Firefox all work. Grant the camera/mic permission prompt.

### Where calls show up

| Location | What it shows |
|---|---|
| User → Video Sessions | Their own recent calls with duration |
| Doctor → Video Sessions | Their own recent calls |
| Admin → Sessions | Full platform call log: both parties, who initiated, duration, status, plus totals |

---

## 8. Patient journals & PDF export

Patients keep a journal in **Mood Tracker → My Journal**. Their counselor can read
what they've shared and export it as a branded PDF.

### The privacy model

Every entry has a **share toggle** in the composer, shown as a full-width control
just above *Save Entry*:

| Toggle state | What it means |
|---|---|
| **Visible to your counselor** (default) | The counselor assigned to them can read it |
| **Private — just for you** | Hidden from every counselor, and excluded from the PDF |

Private entries are filtered out **server-side** in `journal.service.js` — their
text never reaches the doctor's browser at all. The counselor only sees a count of
how many were withheld, never the contents. Entries locked as private show a small
padlock in the patient's own list.

### Where the doctor reads them

Two places, both showing the same data:

- **Sidebar → Patient Journals** (under INSIGHTS) — full page with a patient
  selector, per-patient stats, recurring themes, searchable expandable entries,
  and the **Download PDF summary** button.
- **Patients → pick a patient → Journal tab** — a compact preview in the drawer,
  with a button through to the full page.

### The PDF

Generated on demand by `pdfkit`, streamed straight to the browser — nothing is
written to disk. It contains a branded header, patient/clinician block, at-a-glance
stats, recurring themes, an explicit notice of how many entries were kept private,
and the full text of every shared entry with a confidentiality footer on each page.

```
GET /api/doctor/journals            overview of all your patients
GET /api/doctor/journals/:id        one patient's shared entries + summary
GET /api/doctor/journals/:id/pdf    the PDF download
```

All three return **404** if the patient isn't yours, and **403** for non-doctors.

---

## 9. Counselor applications & credential verification

Counselors can't self-register. They apply publicly, upload credentials, and an
admin verifies them before an account exists.

### The flow

1. **Apply** — "Join as Counselor" in the navbar, or the *Are you a counselor?*
   section near the bottom of the landing page → `/join-as-counselor`.
   A 3-step form: about you → practice details → **upload degree & certifications**.
   They choose their own password during the application.
2. **Review** — the application lands in **Admin → Applications** (sidebar shows a
   live count of pending ones). The admin opens each uploaded certificate in a new
   tab to check it, then approves or rejects with an optional note.
3. **Approved** — a real doctor account is created instantly, marked *Verified*,
   with the credentials attached for audit. They sign in with the email and password
   from their application and appear in the counselor list users browse.
4. **Rejected** — no account is created. The applicant sees the reason via the
   *Already applied?* status checker on the application page.

### Certificate security

This was treated carefully, since these are identity documents:

- Uploads go to **`backend/private/certificates/`** — deliberately *outside*
  `uploads/`, which is served statically at `/uploads`. Guessing a URL returns 404.
- The only way to read one is `GET /api/admin/applications/:id/documents/:docId`,
  which requires an **admin** token. Doctors and users get 403; anonymous gets 401.
- Filenames are randomised on upload, and path traversal is blocked.
- The applicant's password is **hashed at submission** — the plaintext is never
  stored, even while the application sits pending.
- `backend/private/` is in `.gitignore` so certificates are never committed.

```
POST /api/applications                 public — submit with files
GET  /api/applications/status?email=   public — check your own status

GET  /api/admin/applications                        review queue + counts
GET  /api/admin/applications/:id                    full application
GET  /api/admin/applications/:id/documents/:docId   stream a certificate
PUT  /api/admin/applications/:id/approve            creates the doctor account
PUT  /api/admin/applications/:id/reject             with an optional reason
```

Accepted file types: PDF, JPG, PNG, WEBP · max 8 MB each · up to 3 degree + 3
certification files.

---

---

## 10. Payments & feedback (user panel)

### Payments — `Dashboard → Payments`

Booking a session records it as **unpaid**. The user pays from the Payments page
(or the "Pay $X" button shown right after booking), picks a method, and gets a
receipt. Cancelling a paid session issues an automatic refund.

> **Simulated gateway.** No card details are ever requested, sent or stored. The
> authorisation step is stubbed in `billing.service.js` — everything around it
> (receipts, fee split, refunds, admin reporting) is real. Swapping in Stripe or
> Razorpay means replacing one `authorise()` function.

Each payment records the platform fee split (default 20% platform / 80%
counselor, configurable in Admin → Settings) and appears in **Admin → Payments**.
Bookings awaiting checkout show there as *Pending*.

```
GET  /api/billing              your payments, outstanding sessions, methods
POST /api/billing/pay          { appointmentId, method }
GET  /api/billing/receipt/:id
```

### Feedback — `Dashboard → Feedback`

After a session is marked **completed**, it becomes reviewable. Users give 1–5
stars plus an optional comment, and can post anonymously (the counselor sees the
review but not the name — the account is still recorded internally so nobody can
review the same session twice).

Submitting a review:
- appears in the counselor's **Feedback** page,
- appears in **Admin → Feedback**,
- recalculates that counselor's headline rating shown to users.

```
GET  /api/feedback                        reviewable sessions + your reviews
POST /api/feedback                        { counselorId, appointmentId, rating, comment, anonymous }
GET  /api/feedback/counselor/:counselorId public rating summary
```

You can only review a counselor you've actually worked with — enforced server-side.

---

## 11. What the admin panel can do

Every screen reads and writes live data through `/api/admin/*`. Nothing is hardcoded.

| Screen | Capabilities |
|---|---|
| **Dashboard** | Live counts, revenue, 12-month growth, weekly appointments, session-type split, real activity feed, top counselors, private notes |
| **Users** | List, search, sort, filter, view full profile (appointments, documents, mood/journal counts), add, edit, suspend/reactivate, delete (cascades), CSV export |
| **Counselors** | Grid/list view, approve or reject pending applications, edit profiles, suspend/reinstate, remove, CSV export. Approving one makes them bookable by users instantly |
| **Appointments** | Calendar + list view, reschedule, reassign counselor, cancel with reason, mark completed |
| **Sessions** | Today's schedule, live/completed states, KPIs, ratings and counseling notes |
| **Messages** | Read-only monitor of real user↔counselor threads, auto-flags conversations with sensitive keywords |
| **Feedback** | Real ratings and reviews, sentiment split, reply to a review (marks it resolved), delete |
| **Payments** | Transactions derived from bookings, revenue, 80/20 counselor-payout split, 6-month trend, CSV export |
| **Analytics** | Growth, engagement funnel, completion/cancellation rates, specialization split, platform-wide mood distribution |
| **Reports** | Five CSV reports generated on demand from the live database |
| **Notifications** | Broadcast to all users or counselors — they land in the users' real notification feed. System alerts for pending approvals and flagged chats |
| **Settings** | Organization details, security policy, working hours, admin alert preferences, roles & permissions, sign-in audit log. All persisted server-side |
| **Profile** | Edit your own details, change password (verifies the current one), view the platform audit trail |

---

## 12. Project structure

```
Major Project Final/
├── src/                          ← ONE React app, three panels
│   ├── main.tsx
│   └── app/
│       ├── routes.ts             ← /, /login, /dashboard/*, /doctor, /admin
│       ├── DoctorPanel.tsx       ← doctor shell + role guard
│       ├── admin/                ← admin panel (merged in)
│       │   ├── App.tsx           ← admin shell + role guard
│       │   ├── lib/adminApi.ts   ← admin API client
│       │   ├── components/       ← 15 admin screens
│       │   └── context/
│       ├── components/
│       │   ├── pages/            ← public + user pages
│       │   ├── doctor/           ← doctor screens
│       │   └── DashboardLayout.tsx  ← user shell + role guard
│       ├── components/IncomingCallRinger.tsx  ← global ring on any screen
│       ├── components/pages/JoinAsCounselorPage.tsx   ← public application form
│       ├── components/doctor/journals/                ← patient journals + PDF
│       ├── admin/components/Applications.tsx          ← credential review
│       ├── context/AuthContext.tsx
│       └── lib/
│           ├── api.ts · auth.ts
│           ├── callClient.ts     ← WebRTC engine + socket singleton
│           └── callInbox.ts      ← ringer → video page hand-off
├── backend/
│   ├── server.js · app.js        ← server.js also attaches signaling
│   ├── seed.js                   ← admins, demo passwords, demo relationships
│   ├── realtime/
│   │   └── signaling.js          ← Socket.IO: presence, call setup, SDP/ICE relay
│   ├── routes/       admin, video, applications, doctor + 10 others
│   ├── controllers/  admin, video, applications, doctor + 10 others
│   ├── services/     admin, video, relationship, applications, pdf + 9 others
│   ├── private/
│   │   └── certificates/         ← applicant credentials, NEVER served statically
│   ├── middleware/   auth (authenticate + requireRole), validate, error
│   ├── utils/        jwt, password, fileStore, response
│   └── data/         JSON store — users, doctors, admins, appointments, calls, …
├── admin/                        ← ⚠ ORIGINAL standalone app, no longer used
└── .env / backend/.env
```

> **Note on the `admin/` folder:** it was a separate Vite app. Its screens now live in
> `src/app/admin/` and run inside the main app at `/admin`. The old folder is left
> untouched as a backup — you can delete it whenever you're ready. Don't run
> `pnpm dev` inside it; it has no backend wiring.

---

## 13. Admin API reference

All require `Authorization: Bearer <admin token>`.

```
GET    /api/admin/dashboard              GET    /api/admin/analytics
GET    /api/admin/reports                GET    /api/admin/reports/:type/download
GET    /api/admin/audit-log

GET    /api/admin/users                  POST   /api/admin/users
GET    /api/admin/users/:id              PUT    /api/admin/users/:id
DELETE /api/admin/users/:id

GET    /api/admin/counselors             POST   /api/admin/counselors
GET    /api/admin/counselors/:id         PUT    /api/admin/counselors/:id
DELETE /api/admin/counselors/:id

GET    /api/admin/appointments           PUT    /api/admin/appointments/:id
DELETE /api/admin/appointments/:id       GET    /api/admin/sessions

GET    /api/admin/messages               GET    /api/admin/messages/:userId/:counselorId
GET    /api/admin/feedback               PUT    /api/admin/feedback/:id
DELETE /api/admin/feedback/:id           GET    /api/admin/payments

GET    /api/admin/notifications          POST   /api/admin/notifications
PUT    /api/admin/notifications/:id/read DELETE /api/admin/notifications/:id

GET    /api/admin/settings               PUT    /api/admin/settings
GET    /api/admin/profile                PUT    /api/admin/profile
PUT    /api/admin/profile/password        GET    /api/admin/calls
```

**Video calling** (any signed-in user or doctor — results are always scoped to you):

```
GET    /api/video/contacts     who you're allowed to call
GET    /api/video/history      your own call history
GET    /api/video/check        ?id=&role= → { allowed: true|false }
GET    /api/video/stats        aggregate call stats
```

**Doctor settings & patient journals:**

```
GET /api/doctor/settings   PUT /api/doctor/settings   PUT /api/doctor/password
GET /api/doctor/journals              overview of your patients' journals
GET /api/doctor/journals/:id          one patient's shared entries
GET /api/doctor/journals/:id/pdf      branded PDF summary
```

**Counselor applications:**

```
POST /api/applications                 public — apply with certificate uploads
GET  /api/applications/status?email=   public — check your application status

GET  /api/admin/applications                        review queue + counts
GET  /api/admin/applications/:id                    full application
GET  /api/admin/applications/:id/documents/:docId   stream a certificate (admin only)
PUT  /api/admin/applications/:id/approve            creates the doctor account
PUT  /api/admin/applications/:id/reject
```

**Socket.IO signaling** (`ws://localhost:5000`, JWT in `auth.token`):

```
presence:list · presence:update
call:invite · call:incoming · call:accept · call:accepted
call:reject · call:rejected · call:cancel · call:cancelled · call:end · call:ended
webrtc:offer · webrtc:answer · webrtc:ice · call:state
```

Existing user/doctor routes (`/api/auth`, `/api/user`, `/api/mood`, `/api/journal`,
`/api/appointments`, `/api/messages`, `/api/counselors`, `/api/ai`, `/api/journey`,
`/api/notifications`, `/api/doctor`) are unchanged.

---

## 14. Environment variables

Both files already exist.

**Root `.env`** (frontend)
```
VITE_API_URL=http://localhost:5000/api
```

**`backend/.env`**
```
PORT=5000
JWT_SECRET=counselconnect_jwt_secret_key_2026_very_secure
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

> Before deploying anywhere public, change `JWT_SECRET` to a long random string and
> change all the demo passwords above.

---

## 15. Troubleshooting

| Symptom | Fix |
|---|---|
| "Couldn't load…" on every admin screen | Backend isn't running. Start it in `backend/` with `npm run dev` |
| "Invalid email or password" with the listed credentials | Run `npm run seed` in `backend/` |
| "This account has been suspended" | The account was suspended from the admin panel. Set it back to Active under Users |
| Login sends you to the wrong panel | Sign out and back in — the role is read from a fresh token |
| Port 5000 already in use | Change `PORT` in `backend/.env` and `VITE_API_URL` in the root `.env` to match |
| Want a clean slate | See section 13 |
| Video: "You don't have a counselor yet" | That account isn't connected to anyone. Book a session from Find Counselor, or run `npm run seed` which links the demo accounts |
| Video: counselor shows as "Offline" | They must be signed in with the app open. Use a second browser or an incognito window |
| Video: camera never starts | Allow the browser's camera prompt, and make sure you opened `http://localhost:5173` — not a LAN IP over plain http |
| Video: "Your camera is already in use" | Close Zoom/Teams/Meet or any other tab holding the camera |
| Video: connects but no picture | Both sides must allow camera. Check the browser console; on strict corporate networks direct P2P can be blocked |
| Journal: doctor sees "hasn't written any entries" | The patient may have marked every entry private, or they aren't linked to you. Check the private count shown on the page |
| PDF download does nothing | Your browser may be blocking the generated file. Check the downloads bar, and allow pop-ups for localhost |
| Certificate won't open | It opens in a new tab — allow pop-ups for `localhost:5173`. Only admin accounts can open them |
| Application says email already exists | That email already has an account, or a pending application. Use a different one |
| Mood Trend on the dashboard looks empty | You haven't logged a mood this week. Log one and the point appears |
| Payments page shows nothing outstanding | Every booked session is already paid, or you haven't booked one yet |
| A session isn't reviewable | Feedback unlocks once the session status is *completed* |

---

## 16. Reset everything

```bash
cd backend/data
echo "[]" > moods.json
echo "[]" > journal.json
echo "[]" > appointments.json
echo "[]" > notifications.json
echo "{}" > messages.json
cd .. && npm run seed
```
