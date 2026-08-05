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
