# Deploying CounselConnect

A complete, do-it-in-order guide to putting CounselConnect on the internet on a
free plan, with a public URL you can hand to an examiner.

**Time needed:** about 45 minutes the first time.
**Cost:** ₹0. Everything below uses a permanently free tier.

There is one important limitation on the free plan — the backend falls asleep
when nobody uses it. [Part 7](#part-7--stop-the-backend-falling-asleep) fixes
that, and you should not skip it before a review.

---

## What you are building

Right now everything runs on your laptop on two ports. Deployed, it becomes
three separate services that talk to each other over the internet:

```
        Browser
           │
           ├──────────────► Vercel          the React app (the pages people see)
           │                                 counselconnect.vercel.app
           │
           └──────────────► Render          the Express API + video signalling
                               │             counselconnect-api.onrender.com
                               │
                               └──────────► MongoDB Atlas   the database
                                             cluster0.xxxxx.mongodb.net
```

Three things follow from that split, and they cause almost every deployment
problem people hit:

1. **The frontend has to be told where the API lives.** On your laptop it
   assumes `localhost:5000`. That address means "this same computer", so if it
   were left in, every visitor's browser would look for the API on *their own*
   machine and find nothing.
2. **The API has to be told which site is allowed to call it.** Browsers block
   cross-site requests unless the server explicitly permits the origin (this is
   CORS). An API that doesn't know your site's URL rejects every request, which
   looks exactly like the server being down.
3. **The database is no longer on the same machine as the API.** It needs a
   connection string and permission for Render to connect.

Each part below sets up one of these.

---

## Before you start

You need three free accounts. Sign up now so you're not interrupted later:

| Service | What it hosts | Sign up |
|---|---|---|
| **MongoDB Atlas** | the database | https://www.mongodb.com/cloud/atlas/register |
| **Render** | the backend API | https://render.com — choose *Sign up with GitHub* |
| **Vercel** | the React frontend | https://vercel.com — choose *Continue with GitHub* |

Signing up to Render and Vercel **with GitHub** saves a step later, because both
need permission to read your repository.

Your code is already on GitHub at `github.com/Nakuldabhi/CounselConnect-`, which
is what both hosts deploy from.

---

## Part 1 — Push your latest code to GitHub

Both hosts deploy whatever is on GitHub, not what's on your laptop. So push
first, or you'll deploy an old version and wonder why your changes are missing.

Open a terminal in the project folder and run:

```bash
git add .
git commit -m "Add deployment configuration"
git push
```

If `git push` asks for a password, use a **Personal Access Token**, not your
GitHub password — GitHub stopped accepting passwords in 2021. Create one at
github.com → Settings → Developer settings → Personal access tokens → Tokens
(classic) → Generate new token, tick the **repo** checkbox, and paste the token
where it asks for a password.

> **Check before moving on:** open your repository on github.com and confirm you
> can see `render.yaml` and `vercel.json` in the file list. If they're not there,
> the push didn't go through.

---

## Part 2 — Create the database (MongoDB Atlas)

This is the cloud version of the MongoDB you installed locally. Same database,
someone else's computer.

### 2.1 Create a free cluster

1. Log in to Atlas. It will offer to create a deployment.
2. Choose **M0** — the free forever tier. Ignore the paid options; 512 MB is
   far more than this project needs.
3. **Provider and region:** pick AWS and a region near you — `ap-south-1
   (Mumbai)` if you're in India. This only affects speed, not cost.
4. Name it `Cluster0` and click **Create Deployment**.

It takes 1–3 minutes to provision.

### 2.2 Create a database user

Atlas will immediately prompt you to create one. This is a *database* username
and password — nothing to do with your Atlas login.

- Username: `counselconnect`
- Password: click **Autogenerate Secure Password** and **copy it somewhere safe now.**
  You cannot see it again, and you'll need it in about two minutes.

Click **Create Database User**.

> ⚠️ **If your password contains `@`, `:`, `/`, `?`, `#`, `[`, `]` or `%`** you
> must percent-encode it when you paste it into the connection string later, or
> the string will be parsed wrongly and the connection will fail with a confusing
> error. `@` becomes `%40`, `#` becomes `%23`, `/` becomes `%2F`. The simplest
> way to avoid this entirely is to generate a new password containing only
> letters and numbers.

### 2.3 Allow Render to connect

By default Atlas refuses connections from everywhere. Render's free plan doesn't
give your service a fixed IP address, so you cannot allowlist one specific
address.

1. In the left sidebar go to **Network Access**.
2. Click **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`).
3. Confirm.

> **Is that safe?** It allows anyone on the internet to *reach* the database
> port, but not to read anything — they'd still need the username and password,
> which only Render has. This is the standard configuration for platforms with
> dynamic IPs. For a student project it's fine. For real patient data you would
> pay for a static outbound IP and allowlist only that.

### 2.4 Copy the connection string

1. Go to **Database** in the sidebar, and click **Connect** on your cluster.
2. Choose **Drivers**.
3. Select **Node.js**, version **6.7 or later**.
4. Copy the string. It looks like this:

```
mongodb+srv://counselconnect:<db_password>@cluster0.ab12cde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
```

5. Replace `<db_password>` — including the angle brackets — with the password
   you saved in step 2.2.

Keep this string handy. It is the single most important value in this whole
guide, and it is a **secret** — anyone with it has full access to your database.
Don't paste it into chat, a document, or a commit.

---

## Part 3 — Deploy the backend (Render)

### 3.1 Create the service

1. Log in to Render → **New +** → **Web Service**.
2. Connect your GitHub account if asked, and pick the `CounselConnect-`
   repository.
3. Render reads the `render.yaml` file in your repo and fills in most settings
   for you. Confirm these are right:

   | Setting | Value |
   |---|---|
   | Name | `counselconnect-api` |
   | Region | Singapore |
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | **Free** |

   **Root Directory must be `backend`.** This is the most common mistake. Your
   repository has the React app at the top level and the API inside `backend/`.
   If you leave this blank, Render installs the frontend's packages and then
   fails to find `server.js`.

### 3.2 Add the environment variables

Scroll to **Environment Variables**. Render will have pre-filled some from
`render.yaml` and will prompt you for the rest. Set these:

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | your Atlas string from 2.4 | the secret |
| `MONGODB_DB` | `counselconnect` | |
| `MONGODB_REQUIRED` | `true` | |
| `NODE_ENV` | `production` | |
| `JWT_SECRET` | click **Generate** | Render makes a random one |
| `FRONTEND_URL` | leave blank for now | you'll fill it in Part 5 |
| `RAZORPAY_KEY_ID` | your `rzp_test_…` key | optional, see Part 6 |
| `RAZORPAY_KEY_SECRET` | your Razorpay secret | optional, see Part 6 |

> **Why `JWT_SECRET` is not optional.** It's the key used to sign login tokens.
> The code has a fallback for local development, but that fallback is visible in
> your public repository — so if it were used in production, anyone who read
> your code could forge a token for any account, including admin. The server now
> **refuses to start** in production without a real one, so if you skip this
> you'll see a clear error in the logs rather than a silent security hole.

### 3.3 Deploy

Click **Create Web Service**. The first build takes 3–5 minutes.

Watch the **Logs** tab. A successful start looks like this:

```
🌿 CounselConnect API
   Environment : production
   Port        : 10000
   Database    : MongoDB — counselconnect at mongodb+srv://...
                 22 collections, 198 documents
```

**Notice the document count.** On the very first boot the server copies the
sample data from `backend/data/*.json` into Atlas automatically, so your
counselors, appointments and demo accounts are all there without you importing
anything. It only fills collections that are empty, so restarting never
overwrites real data later.

### 3.4 Confirm it's alive

Render shows your URL at the top, something like
`https://counselconnect-api.onrender.com`. Open this in a browser:

```
https://counselconnect-api.onrender.com/api/health
```

You should get:

```json
{"success":true,"message":"CounselConnect API is running",
 "database":{"engine":"mongodb","collections":22,"documents":198}}
```

`"engine":"mongodb"` is the bit that matters — it confirms Atlas is connected.

**Copy this URL.** You need it in the next part.

---

## Part 4 — Deploy the frontend (Vercel)

### 4.1 Import the project

1. Log in to Vercel → **Add New…** → **Project**.
2. Import the `CounselConnect-` repository.
3. Vercel detects Vite automatically. Leave Framework Preset, Build Command and
   Output Directory as they are — `vercel.json` already sets them.
4. **Do not click Deploy yet.** Expand **Environment Variables** first.

### 4.2 Set the API address

Add one variable:

| Key | Value |
|---|---|
| `VITE_API_URL` | `https://counselconnect-api.onrender.com/api` |

Use *your* Render URL from 3.4.

Two details that will cost you an hour if you get them wrong:

- **It must end in `/api`** and have **no trailing slash.** The app appends
  paths like `/auth/login` directly to this value.
- **This is baked in at build time, not read at runtime.** Vite replaces
  `import.meta.env.VITE_API_URL` with the literal text during the build. So if
  you change this variable later, you must **redeploy** for it to take effect —
  editing it alone does nothing to the site that's already live.

The video calling connects to the same host with `/api` stripped off
automatically, so there's nothing extra to configure for calls.

### 4.3 Deploy

Click **Deploy**. It takes about a minute. You'll get a URL like
`https://counselconnect.vercel.app`.

Open it. **The landing page will load, but logging in will fail.** That's
expected — you haven't told the API about this URL yet. That's the next part.

---

## Part 5 — Introduce them to each other

The API is currently refusing requests from your Vercel site because it has
never heard of it.

1. Copy your Vercel URL exactly, e.g. `https://counselconnect.vercel.app`
   (no trailing slash).
2. Go back to Render → your service → **Environment**.
3. Set `FRONTEND_URL` to that URL.
4. Click **Save Changes**. Render restarts automatically — give it a minute.

Now reload your Vercel site and log in:

| Panel | Email | Password |
|---|---|---|
| **User** | `asra@gmail.com` | `User@123` |
| **Counselor** | `sarah.chen@counselconnect.com` | `Doctor@123` |
| **Admin** | `admin@counselconnect.com` | `Admin@123` |

If login works, all three services are talking. **The deployment is done.**

> **Deploying more than one site?** `FRONTEND_URL` accepts several URLs
> separated by commas. Vercel preview builds (`*.vercel.app`) are allowed
> automatically so pull-request previews work without any extra configuration;
> set `ALLOW_VERCEL_PREVIEWS=false` if you'd rather lock that down.

---

## Part 6 — Payments (optional)

If you set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` on Render, booking a
session opens the real Razorpay Checkout in test mode.

If you leave them blank, the app automatically falls back to its built-in
simulated payment form, and the booking flow still works end to end. Nothing
breaks — you just don't get the Razorpay window.

Use a Razorpay test card at checkout:

- Card `4111 1111 1111 1111`, any future expiry, any CVV, OTP `1234`
- Or choose UPI and use `success@razorpay`

No real money moves in test mode.

> **Never put the key secret in the repository.** It belongs only in Render's
> environment variables. The key *id* (`rzp_test_…`) is public by design and is
> sent to the browser; the secret is what proves a payment is genuine.

---

## Part 7 — Stop the backend falling asleep

**Read this part before any review or demo.**

Render's free plan shuts your backend down after **15 minutes** with no
requests. The next request wakes it, but that takes **up to a minute** — and
during that minute the site looks completely broken. An examiner clicking
your link cold would see a spinner, then errors.

The fix is to have something request your health endpoint every few minutes so
Render never considers it idle.

### Set up a free pinger

1. Go to https://cron-job.org and create a free account.
2. **Create cronjob**:
   - Title: `Keep CounselConnect awake`
   - URL: `https://counselconnect-api.onrender.com/api/health`
   - Schedule: **Every 10 minutes**
3. Save and enable it.

(UptimeRobot works equally well with a 5-minute check.)

Ten minutes is comfortably inside the 15-minute window. Your service now stays
warm.

> **A note on the free hours.** Render's free plan includes 750 instance-hours a
> month, and a month is about 730 hours — so one always-awake service fits,
> just. If you run a second free service, keeping both awake will exceed the
> allowance. Keep it to this one.

### On the day of the review

Even with a pinger, do this 10 minutes before you present:

1. Open the site yourself and log in.
2. Click through the pages you plan to show once.

This warms the service *and* Vercel's edge cache, so the first thing the
examiner sees is instant.

---

## Verify everything works

Go through this list on the deployed site, not on localhost:

- [ ] Landing page loads
- [ ] Log in as user, counselor and admin
- [ ] Counselor list shows photos and prices (in ₹)
- [ ] Book a session — payment window opens, test card succeeds, booking appears as confirmed
- [ ] Chat sends a message and it arrives
- [ ] Video call connects between two browsers (see the note below)
- [ ] Admin dashboard shows real numbers
- [ ] Open Atlas → Browse Collections and see the data change as you use the site

**Testing video calls:** open the user in a normal window and the counselor in
an incognito window, as you do locally. Deployed, calls actually work *better*
than on localhost — browsers require HTTPS for camera and microphone access, and
your deployed site has it. Note that calls connect browser-to-browser directly,
so two people on restrictive networks (some college wifi) may fail to connect;
this needs a TURN server, which is not part of the free setup.

---

## Known limits of the free deployment

Be upfront about these if an examiner asks — they're deliberate trade-offs, not
oversights.

| Limit | What it means | Why |
|---|---|---|
| **Uploaded files disappear on restart** | Profile photos, chat attachments and documents uploaded on the live site are lost when Render restarts or redeploys. The seeded Unsplash photos are unaffected. | Free instances have no persistent disk. Fixing it properly means object storage (Cloudinary or S3), which is the standard production answer. |
| **Up to a minute to wake** | Only if the pinger in Part 7 is off. | Free-tier sleep after 15 min idle. |
| **One instance only** | The app must not be scaled to 2+ instances. | The database layer keeps a read cache in memory; a second instance would have its own copy and the two would silently disagree. Fixing it means converting the services to async database calls. |
| **Payments are test mode** | No real money moves. | Live Razorpay keys require business KYC. |
| **Refunds are recorded, not sent** | Cancelling marks a payment refunded in your records without calling Razorpay's refund API. | Out of scope for the demo. |
| **512 MB database** | Thousands of appointments would fit. | Atlas M0. |

---

## When something goes wrong

| What you see | What's actually wrong | Fix |
|---|---|---|
| Site loads, but login fails and the browser console says **CORS** | The API doesn't know your site's URL | Set `FRONTEND_URL` on Render to your exact Vercel URL, no trailing slash |
| Every request fails, console mentions `localhost:5000` | `VITE_API_URL` wasn't set, or was set after the build | Set it on Vercel and **redeploy** — it's baked in at build time |
| Render logs: `MongoDB is required but unreachable` | Atlas is refusing the connection | Check Network Access allows `0.0.0.0/0`, and that the password in the URI is right and percent-encoded |
| Render logs: `JWT_SECRET is not set` | Missing secret | Add `JWT_SECRET` on Render (use Generate) |
| Render build fails: `Cannot find module '/opt/render/project/src/server.js'` | Root Directory is wrong | Set it to `backend` |
| First visit hangs for ~a minute, then works | The service was asleep | Set up the pinger in Part 7 |
| Health check says `"engine":"json-files"` | Running on temporary files, **not** your database — data will be lost | `MONGODB_URI` is wrong or unreachable. With `MONGODB_REQUIRED=true` this should be impossible in production; if you see it, that variable isn't set |
| Uploaded photo vanished | Expected on free tier | See the limits table above |
| Changes not appearing | You didn't push, or the deploy failed | `git push`, then check the deploy log on both hosts |

**Where to look first:** Render → your service → **Logs** shows every backend
error as it happens. For frontend problems, open the browser's developer tools
(F12) and read the Console and Network tabs.

---

## Updating the site later

Both hosts watch your GitHub repository, so deploying an update is just:

```bash
git add .
git commit -m "describe what changed"
git push
```

Vercel and Render both rebuild automatically within a minute or two. There is no
separate deploy step.

The one exception: if you change `VITE_API_URL` on Vercel, you must trigger a
redeploy manually (Deployments → ⋯ → Redeploy), because environment variables
are read at build time.

---

## Quick reference

| | |
|---|---|
| Frontend | `https://counselconnect.vercel.app` |
| Backend | `https://counselconnect-api.onrender.com` |
| Health check | `https://counselconnect-api.onrender.com/api/health` |
| Database | Atlas → Cluster0 → `counselconnect` |
| Backend logs | Render dashboard → counselconnect-api → Logs |
| Frontend logs | Vercel dashboard → project → Deployments → Build Logs |

Fill in your real URLs above once you have them.
