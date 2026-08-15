# CounselConnect — Outstanding Work

Running record of what's been built and what's deliberately still open, per panel.
Updated as work lands. Admin section pending the spec.

---

## USER PANEL

### Done
- Auth: register, login, logout, JWT, bcrypt, RBAC, remember me, route guards
- Dashboard: greeting, upcoming, mood overview, AI insight, recommended counselors, quick actions
- Counselor discovery: search, filters, **sort** (rating/experience/fee/sessions/name), **reviews on profile**, **real bookable slots** from counselor availability
- AI counselor recommendation with match scores
- Appointments: book, **reschedule**, cancel, status, **online/in-person mode**, **reason field**, **document attachments**, **details PDF**
- Sessions: join video/**voice**, timer, history
- Chat: **real-time over Socket.IO** (polling retained as fallback), **attachments**, **voice notes**, **typing indicator**, read receipts, history
- Mood: daily entry, **intensity 1–10**, **context tags**, journal, **history view**, **weekly/monthly reports + PDF**
- AI mood analysis, AI summary, journey timeline
- Notifications incl. admin broadcasts, request/decline notices
- Feedback: rate + review a session
- Payments: checkout, billing page, refunds
- **Emergency Support**: region-aware crisis helplines (public, works logged out), grounding exercises, emergency contact, pinned sidebar escape hatch
- **Help & Support**: searchable FAQ, support tickets with admin replies, bug reports
- **Password reset by OTP**: real flow with expiry, attempt limits, rate limiting, no account enumeration
- **Change password**
- **Resources reachable** from the dashboard sidebar
- **My Files**: everything the counselor has shared, with previews and downloads

### Not done
| # | Item | Notes |
|---|---|---|
| U4 | **Email verification** | Not implemented. |
| U6 | **2FA, login activity, active devices, download my data** | Privacy & Security module largely absent. |
| U7 | **Settings: theme / language / accessibility** | All render "Settings coming soon". |
| U8 | **Profile: emergency contact, preferred language, preferred counseling mode, mental-health preferences** | Fields not stored. |
| U10 | **User-side PDF reports** | Doctor has three exports; user has none beyond the mood report. |
| U11 | Session rejoin + private session notes | Backend live (`/api/session-notes`); UI lost when video pages were rebuilt. |

---

## DOCTOR PANEL

### Done
- Auth: login, logout, JWT, bcrypt, change password, session/login history
- **Workflow spine**: client bookings create `pending` requests → **accept/reject with reason** → notifications both sides → payment gated on acceptance → auto-refund on cancel/reject
- Dashboard: today, upcoming, completed, monthly stats, quick actions, **pending requests tile**, **total patients tile**, **request panel**
- Profile: view/edit, specializations, **qualifications**, **licence**, **experience**, **location**, fees, languages, availability, **photo upload**
- Appointments: **request queue**, accept/decline, reschedule, **real calendar view**, status, summary PDF, new-appointment modal
- Patients: profiles, history, mood journals, notes, progress
- Sessions: video/**voice** calling, timer, history
- Counseling notes: create/edit/delete, tags, patient link, **session anchoring**, private/shared, PDF export, AI summarise, AI draft, live formatting toolbar, voice dictation
- **AI session summary** anchored to an appointment, with **tickable follow-up actions**
- AI assistant: dynamic intent engine over real records
- Reports: monthly, patient stats, revenue, **daily breakdown**, PDF/CSV export, **"Recovery Rate" renamed to Average Patient Mood**
- Notifications: persisted read state, **request/cancellation as distinct types**, working settings toggles
- Feedback: view, read, **respond**
- Chat: real-time, typing indicator, attachments (receive), emoji, transcript export
- Documents: real upload/download/preview/delete
- **Share files with a patient**: upload from their card, explicit share/private flag, note attached, unshare any time
- **Real TOTP two-factor** (RFC 6238, verified against the reference vectors): QR enrolment, recovery codes, login challenge, password-confirmed disable
- **Dark mode persists** to the account
- **Patients: export the list** (CSV client-side, branded PDF from the backend), risk filter, and the dead "Add Patient" button removed
- **Availability actually governs booking**: Add Slot works, vacation mode and break time are enforced, auto-reject declines out-of-hours requests
- **Analytics is honest**: hardcoded 93% retention, "peak 10 AM / 2–3 PM" and "busiest Thursday" captions all replaced with computed values; the fabricated flat "Treatment Outcomes" chart replaced by a real caseload mood series; range selector wired up
- **Reports**: duplicate CSV button removed, period selector now filters the charts, session counts year-scoped
- **Messages**: real socket presence (was `online: true` on every thread); call / video / overflow icons removed
- **AI Assistant** alert buttons route to where their label says, carrying the patient
- **Feedback replies reach the client** — with a notification
- **Video calls fixed end to end**: full-viewport call surface (the client's call used to collapse into a strip inside the dashboard), remote video bound by callback ref with an explicit `play()`, the element no longer unmounted by a connection blip, recovery from a drop actually returns to "connected", session clock survives a blip, ring timeout, and Accept opens the call instantly from any screen

### Not done
| # | Item | Notes |
|---|---|---|
| D3 | **Revoke active sessions / devices** | Login history is read-only. |
| D4 | **Doctor cannot SEND chat attachments** | Paperclip uploads to their own Documents and posts a text line. No doctor attach endpoint. Asymmetric — clients can send files, counselors can't. |
| D6 | **Settings: language / privacy / devices** | Render "Settings for this section coming soon". |
| D8 | **Treatment progress is not settable** | It's `Math.round(avgMood * 10)` — a computed mood proxy the counselor cannot update. |
| D9 | Call quality stats, device switcher, fullscreen, keyboard shortcuts, in-call note pad | Built once, lost when the video pages were rebuilt. |

---

## ADMIN PANEL

### Done
- Integrated into the main app with role-based routing and route guards
- Dashboard, users, counselors, appointments, sessions, feedback, payments, analytics, reports, settings, profile
- Counselor applications: review credentials, approve/reject (files stored outside the public uploads folder)
- **Row actions always visible** (were hover-only, unusable on touch)
- **Messages removed** from the admin panel — admins reading private counselling threads is a confidentiality problem
- **Notifications actually send**: audience normalised, broadcasts reach user and doctor feeds, delete retracts
- **Error boundaries** on every admin page; API client surfaces HTTP status and non-JSON responses
- Fixed: missing `applications` key in TopNav `pageMeta` crashed the whole admin shell
- **Dashboard hero**: greets the role, not the signed-in person; summary line reports applications awaiting review, today's sessions and pending requests from live counts
- **Payments verified dynamic** — transactions, revenue, payouts, platform fee and the 6-month series all derive from `payments.json` + real bookings
- **Notifications**: fake Email/SMS channels removed, `Clients` / `Counselors` / `Everyone` / `Admins` audiences that match the server, honest recipient counts, and **real scheduling** (it used to send immediately and claim otherwise)

### Not done
**Added since:** support-ticket queue with reply and status management.

_Full gap analysis still awaiting the Admin functionality spec._

---

## CROSS-CUTTING

| # | Item | Notes |
|---|---|---|
| X0 | **Every upload in the app was broken** — FIXED | `api.upload` sent `Content-Type: application/json` alongside a FormData body, so no multipart boundary was generated and multer never saw a file. Documents, chat attachments, profile photos and patient file sharing all failed with "No file was uploaded". One line in `api.ts`. |
| X1 | **No TypeScript checking** | No `tsconfig.json`, TypeScript not installed. `Record<Page, PageMeta>` was pure decoration — that's exactly how the admin-shell crash slipped through. A `typecheck` script would catch this class of bug. Adding it will likely surface pre-existing errors. |
| X2 | **Email delivery** | Password reset works end to end but the code is delivered to the server console in development. `deliver()` in `passwordReset.service.js` is the single seam for a real mailer. Still needed for U4 (email verification). |
| X3 | **2FA is available but not enforced** | Any account can enable it; nothing requires it. A policy (e.g. mandatory for counselors) would be a product decision. |

---

## DATABASE

Storage moved from JSON files to **MongoDB** (`counselconnect`), visible in Compass.
See `DATABASE.md` for setup.

- All 21 stores became collections of the same name; documents keep their `id` and reuse it as `_id`
- Existing data imported on first boot; JSON files kept untouched as the backup
- `npm run db:status`, `npm run db:import`, and `/api/health` report the live database
- Falls back to the JSON files (with a warning) if MongoDB isn't running, so a stopped database never blocks a demo

| # | Item | Notes |
|---|---|---|
| DB1 | **Single-process assumption** | Reads are served from an in-process cache loaded at boot; writes go straight to MongoDB. Correct for one backend instance. Running several would need the services converted to async/await against the driver. |
| DB2 | ~~Not verified against a real mongod~~ **CLOSED** | Verified on the user's PC 5 Aug 2026: MongoDB 8.0 + Compass 1.49.12, all 21 collections created and all 198 documents imported with counts matching exactly. |
| DB3 | **Silent fallback can split the data** | If MongoDB is not running at boot, the server starts on the JSON files and anything created that session is written there, not to MongoDB — and the importer only fills *empty* collections, so it is never merged back. `MONGODB_REQUIRED=true` in `backend/.env` turns this into a startup error instead. |

---

## PAYMENTS — Razorpay

Real payment gateway, live in **test mode** (`rzp_test_…`). The old simulated
form is kept as a fallback and still works when no keys are configured.

### How it works

**Pay first, book second.** The appointment is created only *after* the server
has re-computed Razorpay's signature — so an abandoned or failed payment never
leaves an unpaid booking holding a slot on the counselor's calendar.

```
Confirm Booking
  → POST /billing/order    slot re-checked, fee read from the counselor record,
                           Razorpay Order opened, booking parked as an "intent"
  → Razorpay Checkout      card / UPI / netbanking / wallet
  → POST /billing/verify   HMAC-SHA256 of `order_id|payment_id` re-computed with
                           our secret; only on a match is the appointment created
                           as confirmed + paid, with a payment record and receipt
  → POST /billing/abandon   if the customer closes the sheet — nothing is booked
```

Three things the browser is deliberately not trusted with:

| Risk | Guard |
|---|---|
| A modified client sets its own price | The fee is read from the counselor's record server-side. A `price` in the request body is ignored entirely. |
| A forged "payment succeeded" POST | The signature is an HMAC keyed with the secret, compared with `timingSafeEqual`. Only Razorpay can produce it. |
| The same payment replayed to get two bookings | The intent is marked `paid`; a replay returns the original booking instead of creating a second one. |

### Currency

The gateway charges in **₹**. Every screen now asks the server for the symbol
(`GET /billing/config` → `backend/utils/money.utils.js`, `src/app/lib/money.ts`)
instead of typing `'$'` literally, which it did in 24 places across 11 files —
checkout would have said ₹80 while the dashboard, reports and PDFs said $80 for
the same session.

| # | Item | Notes |
|---|---|---|
| P1 | **Test mode only** | Real cards are not charged. Going live means swapping in `rzp_live_…` keys and completing Razorpay's KYC — no code change. |
| P2 | **Refunds are recorded, not sent** | Cancelling marks the payment refunded in our own records; no refund is issued through Razorpay's API. Fine for the demo, needs `POST /payments/:id/refund` for real money. |
| P3 | **No webhook** | Confirmation relies on the browser returning from Checkout. If the customer's connection drops after paying but before `/billing/verify` lands, the money is taken and the booking is not created — the intent stays `created` and needs manual reconciliation. Razorpay's `payment.captured` webhook is the proper fix. |
| P4 | **Keys live in `backend/.env`** | Gitignored and untracked, so they are not in the repo — but they *are* inside the zip you send teammates. Test keys are safe to share within the team; never publish them. Without the keys the app falls back to the simulated form, so a teammate can still run everything. |

---

## DEPLOYMENT

Prepared for a free-tier deploy: **Vercel** (React) + **Render** (Express API and
Socket.IO signalling) + **MongoDB Atlas** (database). Step-by-step instructions
are in `DEPLOYMENT.md`.

### What changed to make it deployable

| Change | Why it was needed |
|---|---|
| **CORS accepts the deployed origin** (`config/cors.config.js`) | Was a fixed array containing only localhost. A deployed frontend would have had every request refused, which looks identical to the API being down. Now checks `FRONTEND_URL` (comma-separated), local dev ports, and `*.vercel.app` previews. |
| **Production refuses to boot without `JWT_SECRET`** | The fallback secret is committed to a public repository. Deployed with it, anyone who read the repo could forge an admin token. It now fails loudly at startup instead. |
| **MongoDB is required in production by default** | Free hosts have no persistent disk. Without this the server would silently fall back to JSON files on a disk that is wiped on every restart — appearing to work while throwing away every new booking and payment. |
| **`trust proxy` enabled** | Render terminates TLS at a load balancer; without this the app sees the balancer's address instead of the client's. |
| **`fileUrl()` helper** (`src/app/lib/api.ts`) | Uploaded files are stored as paths relative to the API server. Two places pasted a hardcoded `http://localhost:5000` in front — the profile-photo **upload was hardcoded**, so it would have failed outright on the live site, and been blocked as mixed content on https. 17 further `<img>` tags rendered bare paths that resolve against the frontend origin, so any uploaded avatar was a broken image. |
| **`vercel.json`** | SPA rewrites — without them, refreshing on any route other than `/` returns a 404, because the server looks for a file that doesn't exist. |
| **`render.yaml`** | One-click blueprint; secrets marked `sync: false` so they are prompted for, never committed. |
| **`backend/.env.example`** | Documents every setting for anyone cloning the repo. Note `.gitignore` had `.env.*`, which was silently excluding this file — a negation was added. |

Verified: 13 production-guard assertions (JWT refusal, database-required
behaviour, 10 CORS origin cases including a lookalike domain and an http
downgrade), real CORS responses and a browser preflight against a live server,
and a clean-room `npm install` + `vite build` from the committed manifest
proving the bundle contains the remote API URL and **zero** references to
localhost.

| # | Item | Notes |
|---|---|---|
| DP1 | **Uploads do not survive a restart** | Free instances have no persistent disk, so profile photos, chat attachments and documents uploaded on the live site are lost on redeploy. Seeded avatars (Unsplash URLs) are unaffected. Real fix: Cloudinary or S3. |
| DP2 | **Free backend sleeps after 15 min idle** | Wakes in up to a minute, during which the site looks broken. `DEPLOYMENT.md` Part 7 sets up a 10-minute pinger. Do not skip before a review. |
| DP3 | **Must stay at one instance** | Same single-process constraint as DB1 — the read cache is per-process. `render.yaml` pins `numInstances: 1`. |
| DP4 | **No TURN server** | Calls are peer-to-peer with STUN only. Two users behind restrictive NATs (some campus wifi) may fail to connect. |
| DP5 | **`react` is only an optional peerDependency** | A clean `npm install` does currently pull it in transitively, and the build was verified end to end — but it is not a declared dependency, so a future dependency change could break the build with a confusing "cannot resolve react". Moving react/react-dom into `dependencies` would remove the risk. |
