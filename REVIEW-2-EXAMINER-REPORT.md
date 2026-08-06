# External Examiner Review — CounselConnect
### Deck assessed: `Review 1 (11-07-'26) Project ppt.pptx` · 28 slides · 16:9
### Reviewed as: Review-2 submission (20 marks)

---

# ⚠️ READ THIS BEFORE ANYTHING ELSE

**You have submitted your Review-1 presentation for a Review-2 evaluation.**

This is not a stylistic quibble. It is the single largest issue in this
assessment, and I have to score it honestly:

| Evidence | Where |
|---|---|
| Filename says `Review 1 (11-07-'26)` | File |
| Slide 2 says **"Review 1 (11/07/2026)"** | Title slide |
| Outline (slide 3) has **no** "Summary of Previous Review" | Slide 3 |
| Outline has **no** "Changes After Review-1" | Slide 3 |
| No slide anywhere addresses reviewer feedback | Whole deck |

**C1 (2 marks) and C2 (4 marks) are 30% of this review's total marks, and this
deck contains literally zero content for either.** An examiner cannot award
partial credit for a slide that does not exist.

There is a second, equally serious problem, and it is the opposite of what most
students suffer from:

> **Your presentation drastically understates what you have actually built.**

Slide 13 lists Video Calling, Chat, Admin Dashboard, Appointment Management and
AI Matching as *"Ongoing"*, and Notifications, AI Journey Summary, API
Integration and Testing as *"Remaining"*. Slide 15 says *"Backend & AI modules
under development"* and *"Data Stores in JSON (as of now)"*. Slide 24 concludes
that *"backend development, authentication, AI-based counselor matching, mood
tracking and testing [are] currently under development."*

All of that is **out of date**. Your working system has real-time video calling
over WebRTC, a full admin panel, a working notification broadcast system, five
PDF report generators, RFC-6238 two-factor authentication, and a live MongoDB
database with 21 collections. **An examiner marking C3 (10 marks) can only award
marks for what you show them.** On the evidence in this deck, you are asking to
be marked as roughly 40% complete when you are closer to 85%.

**Estimated mark if presented unchanged: 6.5 / 20.**
**Realistic mark after the fixes in this report: 17–19 / 20.**

The project is strong. The presentation is the problem. That is a very fixable
situation, and this document tells you exactly what to fix.

---

# PART 1 — RUBRIC EVALUATION

## C1 — Summary of Previous Review — **0 / 2**

**Justification:** No slide summarises Review-1 feedback. There is no
"Previous Review Comments" slide, no "Reviewer Suggestions" slide, and no
acknowledgement anywhere that a Review-1 took place. The deck *is* Review-1.

An examiner will open the deck, see "Review 1 (11/07/2026)" on the title slide,
and mark this criterion zero before you have spoken a word.

**To earn full marks you must add a slide containing:**

| Review-1 comment | Action taken | Status |
|---|---|---|
| *(reviewer's actual words)* | *(what you changed)* | ✅ Done |

Three to five rows. Use the examiner's actual phrasing — they remember what they
said, and quoting them back is the fastest way to earn this mark.

If you genuinely received no written feedback, state that explicitly on the
slide and list what *you* identified as weaknesses and fixed. An empty
acknowledgement scores more than silence.

---

## C2 — Changes After Review-1 — **0 / 4**

**Justification:** Absent entirely. There is no before/after comparison, no
changelog, no "what's new since July" slide.

This is painful because **you have an enormous amount to show here.** Based on
what your system now does versus what slide 13 claims, the following are all
genuine post-Review-1 deliverables:

| Category | What to claim |
|---|---|
| **Architecture** | Three separate front-ends unified into one React app with role-based routing and route guards |
| **Database** | Migrated from JSON file storage to **MongoDB** — 21 collections, live in Compass |
| **New feature** | Real-time **video & voice calling** (WebRTC peer-to-peer + Socket.IO signaling, screen share, in-call chat) |
| **New feature** | Real-time **messaging** — Socket.IO, attachments, voice notes, typing indicators, read receipts |
| **Security** | **Two-factor authentication** implemented to RFC 6238 (TOTP), with QR enrolment and recovery codes |
| **Security** | **Password reset by OTP** with expiry, attempt limits, rate limiting and no account enumeration |
| **New feature** | **Counselor onboarding workflow** — public application form → document upload → admin review → approve/reject |
| **New feature** | **PDF generation** — appointment summary, counseling note, practice report, mood report, patient list |
| **New feature** | Availability engine — bookable slots, vacation mode, break times, auto-reject of out-of-hours requests |
| **New feature** | Payments — checkout, billing history, automatic refund on cancellation |
| **AI** | Counselor matching, mood analysis, journey summary, counselor-side AI assistant over real records |
| **Bug fixes** | Fixed a bug where **every file upload in the application silently failed** (an incorrect `Content-Type` header prevented multipart parsing) |
| **Bug fixes** | Fixed video calls collapsing into a 360px strip; fixed remote video staying black after a network blip |
| **Data integrity** | Replaced fabricated dashboard metrics with values computed from real records |

**Present this as a table with a "Before → After" column.** That last row is
worth calling out at viva: telling an examiner *"we found our analytics were
displaying invented numbers and replaced them with real computations"*
demonstrates engineering maturity that most final-year projects never show.

---

## C3 — Implementation — **4 / 10**

**What the deck proves:** seven UI screenshots (login, find counselor,
appointment booking, mood record, user dashboard, counselor dashboard, admin
dashboard). They look professional and are legitimate evidence of a working
front-end.

**What the deck does not prove — and therefore cannot be credited:**

| Missing evidence | Why it costs marks |
|---|---|
| **No backend/API evidence** | Not one Postman screenshot, terminal output, or JSON response. An examiner cannot distinguish your system from a Figma prototype with hardcoded data |
| **No database evidence** | You now have MongoDB running with 21 collections — and not a single Compass screenshot. This is free marks left on the table |
| **No authentication evidence** | JWT is claimed on three slides and demonstrated on none. No token, no protected-route failure, no bcrypt hash |
| **No AI module evidence** | "AI-powered" appears throughout. There is no screenshot of a match score, a generated summary, or an explanation of the algorithm |
| **No testing evidence** | Slide 13 lists Testing as "Remaining". No test cases, no results, no coverage |
| **No deployment** | Listed as "Remaining". No hosting, no URL, no environment config |
| **No code evidence** | No snippet, no repository structure, no commit history |
| **Slide 13 actively works against you** | It tells the examiner your core modules are unfinished |

**The single highest-value change you can make to this entire presentation** is
adding three evidence slides:

1. **MongoDB in Compass** — the `counselconnect` database with all 21
   collections and document counts visible. Screenshot the collection list, then
   one open collection (`appointments` or `users`) showing real documents.
2. **API testing** — Postman or Thunder Client showing `POST /api/auth/login`
   returning a JWT, and one protected endpoint returning `401` without it. Two
   screenshots side by side.
3. **Video call in progress** — two browser windows, both showing live video,
   with the call timer running. This is your most impressive feature and it is
   currently invisible.

Those three slides alone would move C3 from 4 to approximately 8.

---

## C4 — Presentation & Question Answer — **2.5 / 4**

**Credit where due:** the visual design is genuinely above average. Consistent
28pt section headings, a coherent blue/teal palette, well-constructed
infographics on slides 9, 10 and 12, and clean tables. This does not look like a
last-minute deck.

**Deductions:**

| Issue | Severity |
|---|---|
| Slide 1 is **completely empty** — the deck opens on a blank screen | High |
| Slide 28 is **completely empty** — the deck ends on a blank screen | High |
| Slide 2 says **"Mini Project (01CE0609), Semester 6"** — your enrolment numbers show 7EC-2 (7th semester) and this is a *Major* Project | High |
| Typos: **"Provides Provides"**, **"Mental Hhealth"** ×2, **"BetterHhelp"** (slide 6) | Medium |
| "journey Summaries" lowercase (slide 14); missing spaces in "Engineering,Faculty" (slide 2) and "JSON(as of now)" (slide 15) | Low |
| Slide 11 has **the same image placed twice**, and its "Technologies" / "Tools Used" labels sit outside the images they label | Medium |
| Slide 14 (database) will attract hostile viva questions — see the Database Review | High |
| No slide numbers, no footer | Low |

The "Hh" pattern in three separate words is the signature of a careless
find-and-replace. An examiner who spots one will start looking for others.

---

## Rubric Total: **6.5 / 20**

| Criterion | Marks | Awarded |
|---|---|---|
| C1 — Summary of Previous Review | 2 | **0** |
| C2 — Changes After Review-1 | 4 | **0** |
| C3 — Implementation | 10 | **4** |
| C4 — Presentation & Q&A | 4 | **2.5** |
| **Total** | **20** | **6.5** |

---

# PART 2 — SLIDE-BY-SLIDE REVIEW

---

## Slide 1 — *(empty)*

**Purpose:** Unknown — the slide contains no shapes at all.
**Belongs here:** No.
**Technical accuracy:** N/A.
**University standard:** Fails. A presentation must not open on a blank screen.
**Rubric contribution:** C4 (negative).

**Content:** Nothing. Your title content is on slide 2, so this is a stray slide
— probably a layout artefact from a template.

**Scores:** Visual 0/10 · Technical 0/10 · Presentation 0/10 · Confidence 0/10

**Reviewer impression:** The first thing the examiner sees is nothing. It sets a
careless tone before you have said a word.

**Improvements:** Delete it, or move the slide-2 title content onto it.

---

## Slide 2 — Title / Team

**Purpose:** Identify project, team, guide, institution. **Belongs here:** Yes.

**Technical accuracy:** **Contains factual errors.**
- States **"Mini Project (01CE0609)"** — you are presenting a *Major* Project.
- States **"Semester 6"** — your enrolment IDs (7EC-2) indicate semester 7.
- States **"Review 1 (11/07/2026)"** — this must read Review 2 with the new date.

**University standard:** Below standard purely because of the metadata errors.
Layout and typography are fine.

**Rubric contribution:** C4.

**Content:** Team members, IDs and guide are all present — good. Missing:
external guide (if any), academic year, and the department logo.

**Design:** Clean. "Department of Computer Engineering,Faculty of Engineering &
Technology" is missing a space after the comma and would read better on two
lines.

**Scores:** Visual 7/10 · Technical 3/10 · Presentation 6/10 · Confidence 5/10

**Reviewer impression:** An examiner reads the title slide to decide what they
are marking. This one tells them they are marking the wrong review of the wrong
project type in the wrong semester. Fix these four fields first.

**Improvements:** Change to *Major Project · Semester 7 · Review 2 · (date)*.
Add the academic year.

---

## Slide 3 — Outline

**Purpose:** Roadmap. **Belongs here:** Yes.

**Technical accuracy:** Accurate to the deck's own contents — which is the
problem, since the contents are wrong for a Review-2.

**University standard:** Meets it structurally, fails on completeness: no
"Review-1 Feedback" and no "Changes Since Review-1" entries.

**Rubric contribution:** C1, C2 (both by omission).

**Content:** 16 items is on the high side but acceptable. "DataBase Schema"
should be "Database Schema" (capital B is wrong).

**Design:** Readable at 23pt. Consider two columns to reduce vertical run.

**Scores:** Visual 7/10 · Technical 4/10 · Presentation 6/10 · Confidence 5/10

**Improvements:** Insert *"Review-1 Feedback & Actions Taken"* as item 2 and
*"Progress Since Review-1"* as item 3.

---

## Slide 4 — Introduction

**Purpose:** Context and problem domain. **Belongs here:** Yes.

**Technical accuracy:** Sound. The framing (stigma, accessibility,
inconvenience) is a legitimate motivation.

**University standard:** Meets it. This is one of the better slides.

**Rubric contribution:** C4.

**Content:** Good, but entirely unsupported by data. A single statistic with a
citation — WHO prevalence figures, or Indian student mental-health survey data —
would raise this from an assertion to an argument. You already cite WHO and NIMH
in your references but use nothing from them.

**Design:** Slightly text-heavy; two dense paragraphs. The redundant
"Introduction" sub-heading at 24pt duplicates the 28pt title above it.

**Scores:** Visual 7/10 · Technical 7/10 · Presentation 7/10 · Confidence 7/10

**Reviewer impression:** Competent and clear. Add one number and it becomes
persuasive.

**Improvements:** Add a cited statistic. Remove the duplicate sub-heading.

---

## Slide 5 — Problem Statement & Objectives

**Purpose:** Define the gap and the aims. **Belongs here:** Yes.

**Technical accuracy:** The five problems and five objectives map cleanly onto
each other — good discipline.

**University standard:** Meets it.

**Rubric contribution:** C4.

**Content:** Objectives are not measurable. *"Improve counseling efficiency"* —
by what measure? An examiner may ask *"how will you know if you achieved
objective 5?"* Make at least two objectives quantifiable ("reduce booking to
under 3 clicks", "generate a counselor match in under 2 seconds").

**Design:** Balanced two-column layout, good use of space.

**Scores:** Visual 8/10 · Technical 6/10 · Presentation 7/10 · Confidence 6/10

**Improvements:** Make objectives measurable. Number them so you can refer to
"Objective 3" later when showing results.

---

## Slide 6 — Literature Survey

**Purpose:** Survey existing work. **Belongs here:** Yes, but **the content is
not a literature survey.**

**Technical accuracy:** The product descriptions are accurate. However:

> **This is a competitor/product comparison, not a literature survey.**

A final-year literature survey is expected to review **published research** —
papers with authors, years, venues, methodology, findings and limitations. You
have reviewed five commercial products and cited their marketing websites.

Your reference list confirms this: **15 references, of which 0 are research
papers.** Eight are product websites and seven are technology documentation.
For an IEEE-standard final-year project this is a significant academic
deficiency and a very likely viva attack.

**University standard:** Below standard for a Major Project.

**Rubric contribution:** C4 — and it undermines your credibility for C2/C3.

**Content:** No columns for limitations, no gap identification, no citations.

**Typos — three in one table:** *"Provides Provides online counseling"*,
*"Mental Hhealth Platform"* (twice), *"BetterHhelp"*.

**Design:** The table is legible but the "Key Features" column is far too wordy
— 25+ words per cell. Nobody reads that from a projector.

**Scores:** Visual 6/10 · Technical 3/10 · Presentation 5/10 · Confidence 4/10

**Reviewer impression:** This is the weakest technical slide in the deck. An
examiner asking *"which research papers informed your design?"* would currently
receive no answer.

**Improvements:**
1. **Retitle this slide "Existing Systems Comparison"** — then it is honest and
   correct.
2. **Add a genuine Literature Survey slide** with 5–6 actual papers in the
   format: *Author (Year) — Approach — Findings — Limitation*. Search IEEE
   Xplore / Google Scholar for "e-mental health platform", "teletherapy
   effectiveness", "recommender systems in healthcare", "mood tracking mHealth".
3. Fix the three typos.
4. Cut cell text to 8–10 words.

---

## Slide 7 — Limitations Comparison

**Purpose:** Position your system against existing ones. **Belongs here:** Yes.

**Technical accuracy:** Mostly fair. Two claims need care:
- *"AI-based personalized counselor matching"* vs their *"basic or manual"* —
  BetterHelp does use algorithmic matching. Be ready to defend the distinction.
- *"Standard authentication"* for competitors is an assumption you cannot
  evidence. Talkspace and BetterHelp are HIPAA-compliant. **An examiner who
  knows this will challenge you**, and the honest answer is that you are
  comparing your feature set to their *published* feature set.

**University standard:** Meets it. This is a well-conceived slide.

**Rubric contribution:** C4, and supports the novelty argument.

**Content:** Strong. Eight comparison dimensions is thorough.

**Design:** The table is the full width and height of the slide (12.23in ×
6.21in) with no margin — it feels cramped. Text will be small on a projector.

**Scores:** Visual 6/10 · Technical 7/10 · Presentation 7/10 · Confidence 7/10

**Reviewer impression:** Good analytical thinking. Soften the absolute claims
about competitors.

**Improvements:** Add a footnote — *"Comparison based on publicly documented
features as of 2026."* That one line defends the entire slide.

---

## Slide 8 — Features and Benefits

**Purpose:** Summarise capability. **Belongs here:** Yes.

**Technical accuracy:** Accurate, and **understated** — it omits video calling
detail, 2FA, PDF reporting, payments and the counselor onboarding workflow.

**University standard:** Meets it.

**Rubric contribution:** C3 (weakly).

**Content:** Three columns of five items each. Well organised. But this is a
*claims* slide — it needs the evidence slides discussed under C3 to back it.

**Design:** Note the inconsistent line breaks — *"Connects users with / verified
counselors"* and *"Secure Chat & / Video Consultation"* have manual breaks
creating odd indentation. Clean these up.

**Scores:** Visual 7/10 · Technical 6/10 · Presentation 7/10 · Confidence 6/10

**Improvements:** Add 2FA and PDF reporting to Key Features. Fix line breaks.

---

## Slide 9 — Proposed System *(diagram)*

**Purpose:** Show the end-to-end user journey. **Belongs here:** Yes.

**Technical accuracy:** The 8-step flow (Register → Mood Assessment → AI
Recommendation → Booking → Session → Session Notes → Mood Tracking → AI Journey
Summary) is accurate and matches your implementation.

**Typo in the diagram image: "counselsor"** (step 3, "the most suitable
counselsor"). This is inside the image, so it needs regenerating.

**University standard:** Above standard. This is the best slide in the deck.

**Rubric contribution:** C3, C4.

**Content:** Excellent. Three actors at the top, numbered pipeline, key benefits
sidebar, infrastructure strip at the bottom.

**Design:** Professional, well-balanced, good colour discipline. Readable in
under 30 seconds. My only note: the dashed arrows from the three actors converge
on step 3 rather than step 1, which is slightly confusing — all three roles
enter the system at Register/Login.

**Scores:** Visual 9/10 · Technical 8/10 · Presentation 9/10 · Confidence 8/10

**Reviewer impression:** Genuinely impressive. This slide does more for you than
any other.

**Improvements:** Fix "counselsor". Redirect the actor arrows to step 1.

---

## Slide 10 — Methodology *(diagram)*

**Purpose:** Show the development process. **Belongs here:** Yes.

**Technical accuracy:** The seven phases are a **linear waterfall**
(Requirements → Literature → UI/UX → Database → Frontend → Backend → Testing &
Deployment).

> **Likely viva question:** *"You have shown a waterfall model, but you are
> presenting incremental reviews and have clearly iterated on feedback. Which
> methodology did you actually follow?"*

You did **not** follow waterfall. You iterated — building features, receiving
review feedback, fixing bugs, refactoring. That is **iterative/incremental**, or
Agile with review milestones as sprint boundaries. Presenting waterfall when you
practised iteration is a contradiction an examiner will find.

**University standard:** Meets it visually, questionable methodologically.

**Rubric contribution:** C4.

**Design:** Clean, well-numbered, good use of icons and colour. Readable.

**Scores:** Visual 9/10 · Technical 5/10 · Presentation 8/10 · Confidence 5/10

**Improvements:** Either relabel as **"Incremental / Iterative Development"**
with a feedback loop arrow from Testing back to Development, or add a caption
explaining that phases 5–7 were executed iteratively across review cycles. The
second option is easier and equally defensible.

---

## Slide 11 — Tools & Technologies

**Purpose:** Declare the stack. **Belongs here:** Yes.

**Technical accuracy:** **Contains a significant factual error.**

> The slide lists **"Stream (Video Calls)"** under Tools & Services.
> **Your system does not use Stream.** You implemented video calling directly
> with **native WebRTC** (`RTCPeerConnection`, SDP offer/answer, ICE candidates,
> Google STUN servers) over your **own Socket.IO signaling server**.

This error costs you twice:

1. **It is wrong**, and if an examiner asks *"how does Stream handle your
   signaling?"* you will have to correct your own slide mid-viva.
2. **It undersells you badly.** Using a commercial SDK is integration work.
   Implementing WebRTC signaling yourself — offer/answer exchange, ICE
   candidate relay, renegotiation, reconnection handling — is *substantially*
   more impressive engineering, and it is exactly the kind of depth that earns
   marks in a final-year viva.

Also inaccurate: **TypeScript is listed under Frontend only** — correct — but
**MongoDB is listed under "Backend"** rather than as a database tier, and
**Socket.io appears twice** (Backend and Tools).

**Structural defects:**
- **The same image is placed on this slide twice** (identical MD5 hash) —
  one is presumably hidden behind the other.
- The "Technologies" label sits at x=10.34in while the image it labels spans
  x=0.37–9.20in — **the label is outside its image.**
- The "Tools Used" label sits at x=3.11in, y=5.70in; its image spans
  x=6.05–12.88in — **also misplaced.**

**University standard:** Below standard due to the factual error and layout
defects.

**Rubric contribution:** C3, C4 — and a viva risk.

**Scores:** Visual 5/10 · Technical 3/10 · Presentation 5/10 · Confidence 4/10

**Reviewer impression:** A stack slide must be exactly right, because every
technology on it is a licence for the examiner to ask you a question. Listing a
service you do not use is the worst kind of error.

**Improvements:**
1. **Replace "Stream (Video Calls)" with "WebRTC (peer-to-peer video/voice)"**
   and add "Socket.IO (signaling + real-time chat)".
2. Add: **PDFKit** (report generation), **Multer** (file uploads),
   **Recharts** (data visualisation), **Vite** (build tool), **Nodemon** (dev).
3. Delete the duplicate image; fix both label positions.
4. Move MongoDB into its own "Database" column.

---

## Slide 12 — System Design *(diagram)*

**Purpose:** Show system architecture. **Belongs here:** Yes.

**Technical accuracy:** Broadly correct and well-layered: three panels →
Frontend (React/Tailwind/Axios) → REST API → Backend (Node/Express) → three
service modules (Auth, AI Engine, Business Logic) → MongoDB.

**But it has real gaps:**

| Missing | Why it matters |
|---|---|
| **Socket.IO / WebSocket layer** | Your chat and video signaling do **not** go over REST. The diagram shows only "REST API Communication", which is incomplete. Add a parallel WebSocket channel |
| **WebRTC peer-to-peer path** | Video/audio media flows **browser to browser**, never through your server. This is architecturally important and completely absent |
| **File storage** | Multer writes uploads to disk outside the public folder. Not shown |
| **PDF generation service** | Five report generators. Not shown |
| **JWT flow direction** | Auth Module is shown as a sibling of Business Logic, but it is really middleware *in front of* every protected route |

**University standard:** Meets it, but incomplete for the system you built.

**Rubric contribution:** C3, C4.

**Design:** Clear, good colour coding, arrows readable. Well above average.

**Scores:** Visual 9/10 · Technical 6/10 · Presentation 8/10 · Confidence 6/10

**Reviewer impression:** A good diagram of a *simpler* system than you have.
Adding the real-time layer would make it accurate and more impressive.

**Improvements:** Add a second communication channel labelled **"Socket.IO
(WebSocket) — chat, presence, call signaling"** running parallel to the REST
arrow, and a **dashed peer-to-peer arrow directly between two User Panels**
labelled *"WebRTC media (never touches the server)"*. That dashed arrow alone
will earn you a follow-up question you can answer brilliantly.

---

## Slide 13 — Implementation *(Completed / Ongoing / Remaining)*

**Purpose:** Report module status. **Belongs here:** Yes — but **this slide is
actively costing you marks.**

**Technical accuracy:** **Substantially inaccurate — it understates your work.**

| Slide says | Reality |
|---|---|
| Video Calling — *Ongoing* | **Complete.** WebRTC peer-to-peer, screen share, in-call chat, voice-only mode, call history |
| Chat Module — *Ongoing* | **Complete.** Socket.IO real-time, attachments, voice notes, typing indicators, read receipts |
| Admin Dashboard — *Ongoing* | **Complete.** Plus applications review, broadcasts, payments, analytics, support tickets |
| Appointment Management — *Ongoing* | **Complete.** Request→accept/reject workflow, reschedule, calendar, PDF summaries |
| AI Matching Module — *Ongoing* | **Complete.** Plus AI summary, mood analysis and a counselor-side AI assistant |
| Notifications — *Remaining* | **Complete.** Role-targeted broadcasts reaching user and counselor feeds, with scheduling |
| AI Journey Summary — *Remaining* | **Complete.** |
| API Integration — *Remaining* | **Complete.** ~20 route modules, all wired to the front-end |
| Document Downloading — *Ongoing* | **Complete.** Five distinct PDF generators |

**Genuinely still open:** automated test suite, deployment, email delivery,
a few settings sub-pages.

**University standard:** The *format* is good. The *content* is a self-inflicted
wound.

**Rubric contribution:** C3 — this is the slide the examiner will use to decide
your implementation mark, and it argues against you.

**Scores:** Visual 7/10 · Technical 2/10 · Presentation 4/10 · Confidence 3/10

**Reviewer impression:** No examiner will award implementation marks for
features you have listed as unfinished. Update this slide and your C3 mark moves
several points on its own.

**Improvements:** Rebuild the three columns honestly — most items move to
**Completed**; **Ongoing** becomes testing and deployment; **Remaining** becomes
email delivery and the few open settings items. Add a **completion percentage**
("18 of 21 modules complete — 86%"). Examiners like a number.

---

## Slide 14 — Database Schema

**Purpose:** Show database design. **Belongs here:** Yes — but **this is the
most technically dangerous slide in the deck.**

**Technical accuracy:** **Conceptually incorrect.**

The slide shows **three separate databases** — "Users DB", "Counselor DB",
"Admin DB" — with heavily overlapping contents:

- `Users` appears in **all three**
- `Appointments` appears in **all three**
- `Messages`, `Sessions`, `Mood Entries`, `Feedback` appear in **two**

**Problems an examiner will attack immediately:**

> *"Why do you have three databases?"*
> *"If a user updates their profile, which of the three `Users` collections
> changes? How do you keep them consistent?"*
> *"Do you have three MongoDB instances? Three connection strings?"*
> *"What is your consistency model across these databases?"*

**There is no good answer, because the design shown is not what you built.**
Your actual system has **one MongoDB database (`counselconnect`) containing 21
collections** — which is the correct design. The slide describes an architecture
you do not have and could not defend.

**What is also missing — everything a schema slide is supposed to contain:**
- No field names, no data types
- No primary keys, no foreign-key references
- No relationships or cardinality (1:N, M:N)
- No indexes
- No validation rules
- No sample document

**University standard:** Fails. This is a conceptual grouping diagram labelled
as a schema.

**Rubric contribution:** C3 — and a serious viva risk.

**Scores:** Visual 5/10 · Technical 1/10 · Presentation 4/10 · Confidence 2/10

**Reviewer impression:** Every other slide suggests competence. This one
suggests the team does not understand its own data model. It must be replaced.

**Improvements — replace with the real thing.** Your actual collections are:

```
admins        applications   appointments   availability   calls
crisis-log    doctors        documents      feedback       journal
logins        messages       moods          notes          notification-reads
notifications notifications-read            payments
platform-notifications       settings       users
```

Build **two slides**:

**Slide 14a — Collections overview:** one MongoDB cylinder labelled
`counselconnect`, with the 21 collections grouped by domain:
*Identity* (users, doctors, admins, logins, applications) ·
*Scheduling* (appointments, availability, calls) ·
*Clinical* (moods, journal, notes, documents) ·
*Communication* (messages, notifications, platform-notifications, feedback) ·
*Commerce* (payments) · *Support* (crisis-log, settings).

**Slide 14b — Core schema with relationships:** show 4–5 collections with real
fields and the references between them. For example:

```
users                       appointments                 doctors
─────────────────           ──────────────────           ─────────────────
_id        : String         _id          : String        _id        : String
firstName  : String    ┌──> userId       : String        counselorId: String  <──┐
lastName   : String    │    counselorId  : String  ──────┼─ (ref doctors)        │
email      : String    │    dateTime     : ISODate       name       : String     │
passwordHash: String   │    status       : Enum          specialty  : String     │
reason     : String    │    price        : Number        rating     : Number     │
createdAt  : ISODate   │    paymentStatus: Enum          availability: Object    │
     └─────────────────┘                                                          │
                            moods                        feedback                 │
                            ─────────────                ──────────────           │
                            userId  : String ──┐         userId     : String      │
                            value   : 1..5     │         counselorId: String  ────┘
                            tags    : [String] │         rating     : 1..5
                            createdAt: ISODate │         comment    : String
```

State the cardinalities out loud: *one user → many appointments*,
*one counselor → many appointments*, *one appointment → zero-or-one feedback*.

---

## Slide 15 — Current Progress

**Purpose:** Show project status. **Belongs here:** Yes.

**Technical accuracy:** **Out of date and self-damaging.**

- *"MongoDB schema and Data Stores in JSON (as of now)"* — **you have migrated
  to MongoDB.** This sentence tells the examiner your database is not real.
- *"Frontend completed; Backend & AI modules under development"* — the backend
  is substantially complete with ~20 route modules; the AI modules work.

**University standard:** The five-step visual is good; the content is wrong.

**Rubric contribution:** C2, C3 — both negatively.

**Design:** Attractive zigzag timeline. But the text boxes are tiny (1.69in–2.25in
wide) with long sentences crammed in — this will be unreadable projected.

**Scores:** Visual 7/10 · Technical 2/10 · Presentation 5/10 · Confidence 3/10

**Improvements:** Rewrite step 4 as *"MongoDB — 21 collections, migrated from
JSON file storage"* and step 5 as *"Frontend, backend, APIs and AI modules
implemented; testing and deployment in progress."* Shorten every caption to
under 12 words.

---

## Slides 16–22 — Results (7 screenshots)

**Purpose:** Evidence of implementation. **Belongs here:** Yes.

**Technical accuracy:** The screenshots are genuine and show a polished,
consistent, professional UI. This is real evidence and it is credited.

**University standard:** Meets it for front-end. **Does not meet it for a
full-stack project** — every one of the seven is a UI screenshot. There is no
back-end, database, API or testing evidence anywhere in the deck.

**Rubric contribution:** C3 — this is where most of your 4 marks came from.

**Content — what is shown:** login, find counselor, appointment booking, mood
record, user dashboard, counselor dashboard, admin dashboard.

**What is conspicuously absent — and these are your strongest features:**
- **Video call in progress** (two windows, live video, timer running)
- **Real-time chat** with a message visibly arriving
- **MongoDB Compass** showing the collections
- **API response** in Postman with a JWT
- **A generated PDF report**
- **The counselor application → admin approval workflow**
- **2FA QR enrolment**

**Design:** Consistent captions ("Fig 1:", "Fig 2:"...) — good academic practice.
Two inconsistencies: caption y-positions vary (6.59in on slide 17 vs 6.83in
elsewhere), and image widths range from 10.77in to 11.90in, so the frame jumps
between slides. Note "Fig 3 :" and "Fig 4 :" have a space before the colon while
"Fig 1:" does not.

**Scores:** Visual 8/10 · Technical 5/10 · Presentation 7/10 · Confidence 6/10

**Reviewer impression:** Good UI, and clearly a lot of design effort. But seven
consecutive screenshots of the same *kind* of evidence has diminishing returns.
Two of these could be replaced by back-end evidence at no loss and considerable
gain.

**Improvements:** Standardise image width and caption position. Replace two UI
screenshots with a database screenshot and an API-testing screenshot. Add a
one-line annotation to each figure explaining what it *proves*, not what it
*is* — e.g. *"Fig 5: User dashboard — mood chart rendered from live MongoDB
records"*.

---

## Slide 23 — Future Work

**Purpose:** Show forward thinking. **Belongs here:** Yes.

**Technical accuracy:** Reasonable. But **"Payment Gateway"** is listed as
future work when **you have already implemented a payment/checkout/refund
flow**. Either remove it or reword to *"live payment gateway integration
(Razorpay/Stripe)"* to distinguish real money from your simulated flow.

**University standard:** Meets it.

**Rubric contribution:** C4.

**Content:** Five items, sensible. Missing the most credible near-term items:
**deployment to cloud hosting**, **automated testing**, and **email/SMS
notification delivery** — all of which are genuinely next for you.

**Design:** The numbered layout has an odd asymmetry — items 01/02/03 on the top
row, but 04/05 on the bottom row are positioned at x=3.63 and x=7.23, not
aligned under the top row. Looks accidental.

**Scores:** Visual 7/10 · Technical 6/10 · Presentation 7/10 · Confidence 6/10

**Improvements:** Fix the payment inconsistency; add deployment and testing;
align the bottom row.

---

## Slide 24 — Conclusion

**Purpose:** Close the argument. **Belongs here:** Yes.

**Technical accuracy:** **Badly out of date.** It states that *"backend
development, authentication, AI-based counselor matching, mood tracking, and
testing [are] currently under development"* — four of those five are done.

**University standard:** Fails on accuracy.

**Rubric contribution:** C3, C4.

**Content:** One 70-word paragraph at 20pt. It reads like a Review-1 conclusion,
because it is one.

**Design:** A wall of text. No visual hierarchy.

**Scores:** Visual 5/10 · Technical 2/10 · Presentation 4/10 · Confidence 3/10

**Improvements:** Rewrite entirely as 4–5 bullets stating what is **delivered**,
one line on what remains, and one line of impact. End on a strength — this is
the last thing the examiner reads before scoring you.

---

## Slides 25–26 — References

**Purpose:** Academic attribution. **Belongs here:** Yes.

**Technical accuracy:** URLs are correct and formatting is consistent.

**University standard:** **Fails for a Major Project.**

> **15 references. Zero research papers.**
> 8 product websites + 7 technology documentation pages.

A final-year Major Project is expected to cite peer-reviewed literature. Docs
pages for React and Tailwind are not academic references — they belong in a
tools appendix, not a reference list.

**Rubric contribution:** C4.

**Scores:** Visual 7/10 · Technical 2/10 · Presentation 5/10 · Confidence 3/10

**Improvements:** Add **6–8 IEEE/Springer/Elsevier papers** on e-mental health,
teletherapy efficacy, healthcare recommender systems and mHealth mood tracking.
Move the technology docs to a separate "Tools & Documentation" list. Adopt
strict IEEE format: *Author(s), "Title," Journal/Conference, vol., no., pp.,
Year.*

---

## Slide 27 — Q&A

**Purpose:** Invite questions. **Belongs here:** Yes.
**Design:** A single "Q&A" at 48pt. Functional but bare.

**Scores:** Visual 5/10 · Technical N/A · Presentation 6/10 · Confidence 5/10

**Improvements:** Add "Thank You", the team names, and a repository/demo link.
Some teams add a small "Key Takeaways" strip here — it gives the examiner
something to look at while forming questions, and subtly frames the discussion.

---

## Slide 28 — *(empty)*

Delete it. The deck currently ends on a blank screen.

---

# PART 3 — PRESENTATION FLOW REVIEW

**Current sequence:** Title → Outline → Introduction → Problem & Objectives →
Literature → Limitations → Features → Proposed System → Methodology → Tools →
System Design → Implementation → Database → Progress → Results ×7 → Future →
Conclusion → References → Q&A

**Assessment:** The *logic* is sound and follows conventional academic order.
Two structural problems:

1. **No Review-1 feedback section and no Changes section** — 6 marks unclaimed.
2. **Database Schema (14) comes after Implementation (13)** — you show what you
   built before showing the data model it is built on. Design should precede
   implementation.

**Recommended sequence for Review-2:**

| # | Slide | Note |
|---|---|---|
| 1 | Title | **Review 2**, Major Project, Sem 7 |
| 2 | Outline | |
| 3 | **Review-1 Feedback & Actions** | ⭐ **NEW — C1** |
| 4 | **Changes Since Review-1** | ⭐ **NEW — C2** |
| 5 | Introduction | condensed |
| 6 | Problem & Objectives | |
| 7 | Literature Survey | ⭐ **real papers** |
| 8 | Existing Systems Comparison | current slide 6, retitled |
| 9 | Gap Analysis | current slide 7 |
| 10 | Proposed System | current slide 9 ⭐ strong |
| 11 | System Architecture | current slide 12 + real-time layer |
| 12 | **Database Design** | ⭐ **rebuilt — collections + relationships** |
| 13 | Methodology | relabelled iterative |
| 14 | Tools & Technologies | ⭐ **fix WebRTC error** |
| 15 | Implementation Status | ⭐ **corrected — mostly Complete** |
| 16–20 | Results — UI | 5 screenshots, not 7 |
| 21 | **Results — Database** | ⭐ **NEW — Compass** |
| 22 | **Results — API testing** | ⭐ **NEW — Postman** |
| 23 | **Results — Video call live** | ⭐ **NEW** |
| 24 | Testing & Validation | ⭐ **NEW** |
| 25 | Future Work | |
| 26 | Conclusion | rewritten |
| 27 | References | ⭐ with papers |
| 28 | Q&A / Thank You | |

Net change: **+7 slides, −2 empty, −2 redundant screenshots.** Roughly 31
slides, appropriate for a 15–20 minute Review-2.

---

# PART 4 — DIAGRAM REVIEW

| Diagram | Correct? | Readable <30s? | Verdict |
|---|---|---|---|
| **Slide 9 — Proposed System** | ✅ Yes | ✅ Yes | **Excellent.** Fix "counselsor" typo; point actor arrows at step 1 |
| **Slide 10 — Methodology** | ⚠️ Shows waterfall; you practised iteration | ✅ Yes | Add a feedback loop or relabel |
| **Slide 11 — Tools** | ❌ Lists Stream (unused); duplicate image; labels misplaced | ✅ Yes | **Must fix** |
| **Slide 12 — Architecture** | ⚠️ Missing WebSocket + WebRTC layers | ✅ Yes | Add real-time paths |
| **Slide 14 — Database** | ❌ Three databases is wrong; no fields or relations | ⚠️ Looks simple but means nothing | **Must rebuild** |

**Diagrams you do not have and should:**

1. **Use Case Diagram** — three actors (User, Counselor, Admin) with their use
   cases. Standard expectation for a final-year project; its absence is
   noticeable.
2. **ER / Data Relationship Diagram** — see slide 14 rebuild above.
3. **Authentication Flow** — Login → validate → bcrypt compare → issue JWT →
   attach to requests → middleware verifies → role check → protected resource.
   You have TOTP 2FA to add as a branch, which is a strong differentiator.
4. **WebRTC Call Sequence** — Caller → `call:invite` → server → Callee →
   `call:accept` → SDP offer → SDP answer → ICE exchange → **direct P2P media**.
   This single diagram would demonstrate more technical depth than any other
   slide you could add.

---

# PART 5 — SYSTEM ARCHITECTURE REVIEW

**Represented correctly:** React, Node.js, Express, MongoDB, JWT, bcrypt, Axios,
REST API, role-based access, three-tier separation.

**Missing or wrong:**

| Component | Status | Action |
|---|---|---|
| **Socket.IO** | On slide 11 but **absent from the architecture diagram** | Add as a parallel real-time channel |
| **WebRTC** | **Mislabelled as "Stream"** | Correct it and show the P2P media path |
| **Multer** | Used but never mentioned | Add to stack + architecture |
| **PDFKit** | Five generators, never mentioned | Add a reporting service block |
| **Cloudinary** | Not used — you store locally | Correct: say "local file storage (Multer)" and note Cloudinary as future work |
| **Python** | Not used | Correct — do not claim it |
| **Notification service** | Implemented, not in the diagram | Add |
| **Deployment tier** | Absent | Add, even if it is only "localhost — deployment pending" |
| **Security layers** | Partially shown | Add a cross-cutting band: JWT · bcrypt · RBAC · TOTP 2FA · Helmet · CORS · rate limiting |

**Recommended architecture layers for the redrawn diagram:**

```
CLIENT      React SPA (3 role-based panels) — Vite, Tailwind, Recharts
   │ REST (Axios/JSON)          │ WebSocket (Socket.IO)         ╲ WebRTC (P2P media)
   ▼                            ▼                                ╲__ direct browser↔browser
GATEWAY     Express — CORS, Helmet, rate limit, JWT middleware, RBAC guard
   ▼
SERVICES    Auth · Appointments · Messaging · AI Engine · Reporting (PDFKit) ·
            Notifications · Payments · File handling (Multer)
   ▼
DATA        MongoDB — counselconnect (21 collections)   +   local file store (uploads)
```

---

# PART 6 — DATABASE REVIEW

**Current state on the slide:** three databases, no fields, no types, no keys,
no relationships, no indexes, no validation. **Not acceptable at this level.**

**Your actual database (correct, and much better than the slide):** one MongoDB
database, `counselconnect`, 21 collections.

**Gaps to address in the rebuilt slides:**

| Area | Issue | Fix |
|---|---|---|
| **Relationships** | Not shown at all | Show `userId` / `counselorId` references with cardinality |
| **Indexes** | None declared | At minimum index `users.email` (unique), `appointments.userId`, `appointments.counselorId`, `appointments.dateTime`, `moods.userId`. **Expect to be asked "how do you index?"** |
| **Validation** | Application-layer only (express-validator) | Consider MongoDB JSON Schema validation; at least *say* validation is enforced at the API layer |
| **Normalisation** | Some duplication — `counselorName` is stored on appointments as well as referenced | Defend this correctly: **deliberate denormalisation for read performance**, a standard NoSQL pattern. This is a good answer if you give it confidently |
| **Naming** | Mixed conventions — `crisis-log`, `notification-reads`, `notifications-read` | Two of those are confusingly similar. Worth renaming, and worth not drawing attention to |
| **Scalability** | Not addressed | Mention sharding key candidates and that reads are cached in-process |

**Be ready for this question:** *"Is your data normalised?"*
**Model answer:** *"MongoDB is a document database, so we deliberately
denormalise where it improves read performance — for example an appointment
stores the counselor's display name alongside the `counselorId` reference, so
rendering a booking list does not require a join. Where consistency matters more
than speed, we reference by id and resolve at query time."*

---

# PART 7 — IMPLEMENTATION REVIEW

| Evidence expected | Present? | Notes |
|---|---|---|
| Frontend pages | ✅ Yes | 7 screenshots, good quality |
| Backend APIs | ❌ **No** | Zero evidence |
| Authentication | ❌ **No** | Claimed 3×, demonstrated 0× |
| Database | ❌ **No** | Not one Compass screenshot |
| AI modules | ❌ **No** | No output shown, no algorithm explained |
| Dashboard | ✅ Yes | User, counselor, admin |
| Admin panel | ✅ Yes | Screenshot present |
| Real-time chat | ❌ **No** | Implemented, not shown |
| Video calling | ❌ **No** | Your best feature, entirely invisible |
| PDF reports | ❌ **No** | Five generators, none shown |
| Testing | ❌ **No** | Listed as "Remaining" |
| Deployment | ❌ **No** | Listed as "Remaining" |

**Verdict:** the deck proves a **front-end**. It does not prove a **full-stack
system**. That gap is the difference between 4/10 and 8/10 on C3, and closing it
requires three screenshots you can capture in twenty minutes.

---

# PART 8 — TECHNOLOGY STACK REVIEW

| Technology | Used? | Appropriate? | Comment |
|---|---|---|---|
| React | ✅ | ✅ | Correct choice for a multi-role SPA |
| TypeScript | ✅ | ✅ | Good — but note you have no `tsconfig.json`/type-check step, so be careful claiming type safety |
| Tailwind CSS | ✅ | ✅ | Justified by rapid consistent styling |
| Node.js + Express | ✅ | ✅ | Standard, defensible |
| MongoDB | ✅ | ✅ | Justified by flexible, evolving document shapes |
| JWT | ✅ | ✅ | Correct for stateless auth |
| bcrypt | ✅ | ✅ | Correct; know your salt rounds (**12**) |
| Axios | ✅ | ✅ | Fine |
| Socket.IO | ✅ | ✅ | **Under-claimed** — powers chat and call signaling |
| WebRTC | ✅ | ✅ | **Mislabelled as Stream — fix** |
| Multer | ✅ | ✅ | Not mentioned; should be |
| PDFKit | ✅ | ✅ | Not mentioned; should be |
| **Stream** | ❌ **Not used** | — | **Remove from slide 11** |
| Cloudinary | ❌ Not used | — | Do not claim; list as future work |
| Python | ❌ Not used | — | Do not claim |
| OpenAI / Gemini | ❌ Not used | — | ⚠️ **See the AI honesty note below** |

## ⚠️ The AI question — prepare for this carefully

Your presentation says "AI-Powered" on the title, in the introduction, in
features, in benefits and in the architecture. An examiner **will** ask:

> *"What AI are you actually using? Which model? Is it machine learning?"*

Your system's "AI" is **rule-based and statistical** — weighted matching against
declared concerns and mood tags, trend analysis over mood history, and template
generation from real records. **There is no trained ML model and no LLM API.**

**Do not overclaim.** If you say "AI" and the examiner discovers weighted
scoring, you lose credibility across the whole presentation. If you describe it
accurately and confidently, it is perfectly respectable work.

**Model answer:** *"Our AI layer is a rule-based recommendation and analytics
engine. Counselor matching computes a weighted similarity score between the
user's declared concerns, session-type preference, goals and their lowest-mood
context tags against counselor specialisations. Mood analysis performs trend
detection over time-series entries and surfaces correlations between context
tags and mood scores. The journey summary is generated from those computed
statistics rather than a language model. We chose a deterministic approach
because it is explainable and auditable, which matters in a mental-health
context, and because it requires no training data — which we do not ethically
have. Integrating an LLM for conversational support is our documented future
work."*

That answer is honest, technically precise, and turns a weakness into a
reasoned design decision. **Rehearse it.**

---

# PART 9 — RESULTS REVIEW

**Present:** 7 UI screenshots — genuine, consistent, professional.

**Missing proof:**
- Backend running (terminal output showing the API banner and MongoDB connected)
- API request/response with JWT
- Database contents
- Real-time features in action
- Generated PDF
- Test execution
- Performance numbers (API response time, page load)
- Live URL

**Live demo readiness:** you *can* demo — the system runs. But the deck contains
no demo slide and no fallback. **If the demo fails on the day and you have no
video, you have nothing.** Record a 3–4 minute screen capture of the full
workflow this week and embed it. Every experienced examiner has seen a live demo
fail; the teams that recover are the ones with a recording.

---

# PART 10 — REVIEW-2 READINESS CHECKLIST

| Requirement | Status |
|---|---|
| Review-1 changes explained | ❌ **Absent** |
| Completed modules listed | ⚠️ Present but **wrong** |
| Remaining work stated | ⚠️ Overstated |
| Testing | ❌ Absent |
| API integration | ⚠️ Done, not shown |
| Deployment | ❌ Absent |
| Security | ⚠️ Claimed, not evidenced |
| Performance | ❌ Absent |
| Scalability | ❌ Absent |
| Future scope | ✅ Present |

---

# PART 11 — VIVA PREPARATION

### Introduction & Problem

**Q: Why this project?**
*Mental health support suffers from stigma, limited access and fragmented
processes. Existing platforms handle consultation but not continuous care —
they do not connect mood tracking, session history and counselor management in
one workflow. CounselConnect integrates the whole counseling lifecycle for
institutional settings such as colleges and hospitals.*

**Q: Who are your users?**
*Three roles: clients seeking counseling, counselors delivering it, and
administrators managing the platform — each with a distinct interface and
permission set enforced by role-based access control.*

### Architecture

**Q: Explain your architecture.**
*Three-tier. A React single-page application with three role-based panels
communicates with an Express REST API over HTTPS/JSON. Persistent state lives in
MongoDB. Alongside REST we run a Socket.IO channel for real-time chat, presence
and call signaling. Video and audio media never touch our server — WebRTC
establishes a direct peer-to-peer connection between browsers.*

**Q: Why separate the panels rather than build three apps?**
*One codebase, one build, one deployment, and shared components and API client.
Role separation is enforced by route guards and server-side role checks rather
than by shipping separate bundles.*

### React

**Q: Why React?**
*Component reuse across three panels, a large ecosystem, and its state model
suits dashboards that update from polling and WebSocket events.*

**Q: How do you manage state?**
*Local component state with hooks, React Context for authentication, and server
state fetched per view. We deliberately avoided Redux — the app's shared state
is small and Context was sufficient.*

### Node.js / Express

**Q: Why Node for a healthcare app?**
*Its non-blocking I/O model suits a workload dominated by concurrent network
operations — API calls, WebSocket connections and file transfers — rather than
CPU-bound work. It also lets us use one language across the stack.*

**Q: How is your backend organised?**
*Layered: routes define endpoints and validation, controllers handle
request/response, services hold business logic, and utilities handle storage,
PDF generation and authentication. Business logic never touches Express objects,
which makes it independently testable.*

### MongoDB

**Q: Why MongoDB over SQL?**
*Our documents vary in shape — a counselor has qualifications and availability
that a client does not, and mood entries carry variable tag arrays. A document
model handles that without sparse columns or join tables. Related records are
referenced by id where consistency matters.*

**Q: How do you handle relationships without joins?**
*By reference — appointments store `userId` and `counselorId`. We resolve them
in the service layer, and denormalise display fields such as counselor name
where read performance matters more than strict normalisation.*

**Q: How many collections?**
*Twenty-one, in a single database named `counselconnect`.* **(Know this number.)**

**Q: How would you scale it?**
*Indexes on the fields we filter by — email, userId, counselorId, dateTime.
Beyond a single node, shard on userId since most queries are user-scoped.*

### Authentication & Security

**Q: Explain your authentication flow.**
*The client posts credentials; the server looks up the account and compares the
password against a bcrypt hash with 12 salt rounds. On success it issues a
signed JWT containing the user id and role, expiring in 7 days. The client sends
it as a Bearer token; middleware verifies the signature and a role guard checks
authorisation before the route handler runs.*

**Q: Where do you store the token, and what are the risks?**
*localStorage, which is vulnerable to XSS. An httpOnly cookie would be more
secure but requires CSRF protection. For production we would move to httpOnly
cookies with CSRF tokens.* **(Naming the weakness earns more credit than
pretending there isn't one.)**

**Q: Why bcrypt and not SHA-256?**
*SHA-256 is fast, which is exactly wrong for passwords — it makes brute force
cheap. bcrypt is deliberately slow and salted per password, so identical
passwords produce different hashes and rainbow tables are useless.*

**Q: What is your 2FA implementation?**
*Time-based one-time passwords to RFC 6238 — HMAC-SHA1 over a 30-second counter
derived from a shared base32 secret, verified with a ±1 step window against
clock drift, using constant-time comparison. We verified it against the RFC's
published reference vectors.* **(This is a genuinely strong answer — use it.)**

**Q: What other security measures?**
*Helmet for security headers, CORS restricted to the front-end origin, rate
limiting on authentication endpoints, express-validator on all input, uploaded
files stored outside the public directory, and role plus relationship checks —
a counselor can only access patients they actually work with.*

### APIs

**Q: Is your API RESTful?**
*Broadly. Resource-based URLs, HTTP verbs matching intent, JSON bodies, and
standard status codes — 200, 201, 400, 401, 403, 404, 409. It is not fully
HATEOAS-compliant, which is a pragmatic choice.*

**Q: How do you handle errors?**
*Centralised error middleware. Services throw errors carrying a `statusCode`;
the middleware turns them into a consistent `{success, message}` envelope so
the client can handle every failure the same way.*

### Real-time & WebRTC

**Q: How does video calling work?**
*Socket.IO carries signaling only. The caller emits an invite, the server relays
it to the callee's room, and on acceptance the browsers exchange SDP offer and
answer plus ICE candidates through the server. Once negotiation completes, media
flows directly peer-to-peer over WebRTC using Google STUN servers for NAT
traversal. Video never passes through our backend — which reduces server load
and improves privacy.*

**Q: What if peer-to-peer fails?**
*Symmetric NATs and restrictive firewalls can block direct connections. The
production answer is a TURN relay server, which we have documented as future
work. Currently we detect the failure and surface a clear message rather than
leaving the user waiting.*

### AI

**Q: What AI techniques did you use?**
*See the model answer in Part 8 — rule-based weighted matching and statistical
trend analysis, chosen for explainability.* **Rehearse this one.**

**Q: How does counselor matching work?**
*We build a profile from the user's stated reason, preferred session type, goals
and the context tags attached to their lowest mood entries, then score each
counselor by weighted overlap with their specialisations, producing a ranked
list with a match percentage.*

### Testing

**Q: How did you test?**
*Manual functional testing across all three roles, plus scripted integration
checks that boot the real Express application and exercise live endpoints
against a test dataset.* **Be honest: you do not have an automated unit-test
suite in the repository. Say so and state that formal test documentation is the
current priority.**

**Q: What would you test first if you had more time?**
*The authentication and authorisation layer, because a failure there is a
security breach rather than a bug — specifically that a counselor cannot reach a
patient they have no relationship with.*

### Deployment & Performance

**Q: Where is it deployed?**
*Currently local. The deployment plan is the front-end as a static build on
Vercel or Netlify, the API on Render or Railway, and MongoDB Atlas for the
database, with environment variables for configuration — which the codebase
already supports.*

**Q: How does it perform?** *(Measure this before the viva — do not guess.)*

### Project Management

**Q: How did you divide the work?** *(Be specific: who did front-end, back-end,
database, documentation.)*

**Q: What was the hardest problem you solved?**
*A strong answer: "Every file upload in the application was silently failing.
The API client was sending a JSON content-type header with multipart form data,
so no boundary was generated and the server could never parse the file. It
affected documents, chat attachments and profile photos, and produced no error
anywhere — the request simply returned 'no file uploaded'. We traced it to a
single line in the shared API client."* **This is an excellent answer: it shows
systematic debugging, and that one root cause explained several symptoms.**

---

# PART 12 — FINAL EVALUATION

## Marks

| Criterion | Awarded |
|---|---|
| **C1 — Summary of Previous Review** | **0 / 2** |
| **C2 — Changes After Review-1** | **0 / 4** |
| **C3 — Implementation** | **4 / 10** |
| **C4 — Presentation & Q&A** | **2.5 / 4** |
| **TOTAL** | **6.5 / 20** |

## Overall Scores

| Dimension | Score |
|---|---|
| Presentation | **62 / 100** |
| Technical | **45 / 100** |
| Implementation *(as evidenced)* | **40 / 100** |
| Implementation *(as actually built)* | **85 / 100** |
| Visual Design | **74 / 100** |
| Architecture | **55 / 100** |
| Database | **25 / 100** |
| Diagram Quality | **62 / 100** |
| Confidence Projected | **48 / 100** |

## Reviewer Impression: **NEEDS SIGNIFICANT IMPROVEMENT**

**— as a Review-2 submission. Not as a project.**

I want to be precise about this verdict, because the two things are very
different.

**The system you have built is good.** Real-time peer-to-peer video calling with
your own signaling server, RFC-compliant two-factor authentication, a
role-scoped three-panel application, a working counselor onboarding workflow,
PDF report generation, and a live MongoDB database. That is comfortably above
the median final-year project, and parts of it — the WebRTC implementation
especially — are genuinely strong.

**The presentation actively conceals all of it.** It is the wrong deck for the
review. It tells the examiner your database is JSON files, your backend is under
development, your video calling is ongoing and your notifications are not
started. None of that is true any more. It contains a technology you do not use
and a database design you did not build.

An external examiner marks what is in front of them. Right now what is in front
of them is a July presentation describing a July project, and it would score
around **6.5 out of 20** — not because the work is weak, but because the work is
invisible.

**The gap between 6.5 and 18 is about six hours of slide work.** No new code is
required. Everything in the Critical list below is documentation and
screenshots of software that already runs.

---

# PART 13 — PRIORITY CHECKLIST

## 🔴 CRITICAL — fix before you present *(these are worth ~11 marks)*

1. **Change the title slide** to *Major Project · Semester 7 · Review 2 · (date)*
2. **Add "Review-1 Feedback & Actions Taken"** — a table of comment → action →
   status *(C1: +2)*
3. **Add "Changes Since Review-1"** — use the table in the C2 section above
   *(C2: +4)*
4. **Rewrite slide 13** — move video calling, chat, admin, appointments, AI,
   notifications and API integration to **Completed** *(C3: +2)*
5. **Rebuild slide 14 (Database)** — one database, 21 collections, real fields
   and relationships. Delete the three-database diagram *(C3 + removes the
   biggest viva risk)*
6. **Fix slide 11** — replace "Stream" with **WebRTC + Socket.IO**; delete the
   duplicate image; fix the two misplaced labels
7. **Add a MongoDB Compass screenshot** *(C3: +1)*
8. **Add an API testing screenshot** — login returning a JWT, and a 401 without
   it *(C3: +1)*
9. **Add a live video call screenshot** — two windows, both streaming *(C3: +1)*
10. **Delete the two empty slides** (1 and 28)
11. **Fix slide 15** — MongoDB is done, backend is done
12. **Rewrite the conclusion** — it currently describes an unfinished project
13. **Fix the typos** — "Provides Provides", "Mental Hhealth" ×2, "BetterHhelp",
    "counselsor" (inside the slide-9 image), "journey Summaries"

## 🟡 IMPORTANT — do these if you have time *(worth ~3–4 marks and a lot of credibility)*

14. **Add 6–8 real research papers** to the references and retitle slide 6 as
    "Existing Systems Comparison"
15. **Add a Testing & Validation slide** — even a table of 10 manual test cases
    with expected/actual/status
16. **Add the real-time layer to the architecture diagram** (Socket.IO channel +
    dashed WebRTC peer-to-peer path)
17. **Add a Use Case diagram**
18. **Add an Authentication Flow diagram** including the 2FA branch
19. **Rehearse the AI answer** from Part 8 until it is fluent — this is your
    most likely hostile question
20. **Record a 3–4 minute demo video** as a fallback if the live demo fails
21. Relabel the methodology as iterative, or add a feedback loop
22. Make two objectives measurable
23. Standardise the Results slides — same image width, same caption position

## 🟢 OPTIONAL — polish

24. Add slide numbers and a footer
25. Add a WebRTC call sequence diagram *(high impact if you have time — it is
    the most technically impressive thing you could show)*
26. Add a statistic with a citation to the introduction
27. Add a "Key Takeaways" strip to the Q&A slide
28. Add measured performance numbers
29. Align the Future Work bottom row
30. Add the repository link to the closing slide

---

## Closing note

The single most consequential thing in this report is not a slide fix. It is
this: **stop describing your project as unfinished.** Slides 13, 15 and 24 all
tell the examiner that the core of your system is still being built. That was
true in July. It is not true now.

Update those three slides, add the three evidence screenshots, rebuild the
database slide, and this moves from a weak presentation of a good project to a
strong presentation of a good project.

---

*Reviewed against the C1–C4 rubric as an external university examiner. All
findings are based solely on the contents of the submitted `.pptx` file;
where the report references your implemented system, that is stated explicitly
as a contrast with what the deck claims.*
