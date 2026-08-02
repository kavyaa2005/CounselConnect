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

### Not done
| # | Item | Notes |
|---|---|---|
| U1 | **Emergency Support module** | Missing entirely — helplines, one-tap call, crisis resources. Highest-priority omission for a mental-health platform. |
| U2 | **Help & Support module** | No FAQ, support ticket, bug report, suggestions. |
| U3 | **Forgot password / reset via OTP** | Endpoint is a mock returning a canned string; tells users a link was sent when none was. Needs an email service. |
| U4 | **Email verification** | Not implemented. |
| U5 | **Change password (user)** | Doctors and admins have it; users don't. Settings → Security is "coming soon". |
| U6 | **2FA, login activity, active devices, download my data** | Privacy & Security module largely absent. |
| U7 | **Settings: theme / language / accessibility** | All render "Settings coming soon". |
| U8 | **Profile: emergency contact, preferred language, preferred counseling mode, mental-health preferences** | Fields not stored. |
| U9 | **Resources page unreachable when logged in** | Exists at public `/resources` but is not in the dashboard sidebar. |
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

### Not done
| # | Item | Notes |
|---|---|---|
| D1 | **2FA is a fake toggle** | `useState(true)`, never calls the API, no TOTP anywhere. Ships displaying "Enabled · Authenticator app configured" — an untrue claim on a security screen. Fix or remove. |
| D2 | **Forgot password / OTP reset** | Same mock as U3. |
| D3 | **Revoke active sessions / devices** | Login history is read-only. |
| D4 | **Doctor cannot SEND chat attachments** | Paperclip uploads to their own Documents and posts a text line. No doctor attach endpoint. Asymmetric — clients can send files, counselors can't. |
| D5 | **Client-uploaded appointment documents not visible** | Data is stored and returned by the API; only the appointment drawer shows them. No Patients-page surface. |
| D6 | **Settings: language / privacy / devices** | Render "Settings for this section coming soon". |
| D7 | **Dark Mode setting not wired to the theme** | `DoctorPanel` holds `darkMode` in local `useState` and never reads `/doctor/settings`. Saved preference does nothing and resets on reload. |
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

### Not done
_Awaiting the Admin spec — will be filled in._

---

## CROSS-CUTTING

| # | Item | Notes |
|---|---|---|
| X1 | **No TypeScript checking** | No `tsconfig.json`, TypeScript not installed. `Record<Page, PageMeta>` was pure decoration — that's exactly how the admin-shell crash slipped through. A `typecheck` script would catch this class of bug. Adding it will likely surface pre-existing errors. |
| X2 | **Email service** | Required before U3/U4/D2 can be real rather than mocked. |
