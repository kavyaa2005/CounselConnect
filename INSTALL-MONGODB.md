# Installing MongoDB on Windows — full walkthrough

Written for this project, on Windows. Follow it top to bottom; it takes about
15 minutes, most of which is the download.

---

## First: is the project on MongoDB or still on JSON?

**Both, and which one is live depends on your PC right now.**

- **The code has moved to MongoDB.** MongoDB is the database of record. When it
  is running, every read and write goes to it and the JSON files are not
  written to at all.
- **But you haven't installed MongoDB yet**, so at this moment the backend is
  running on the JSON files. That's a deliberate fallback I built in so a
  stopped database can never block a demo — but it means nothing is in MongoDB
  yet, and Compass would show you an empty server.

If you start the backend today you'll see this in the terminal:

```
[store] MongoDB not reachable at mongodb://127.0.0.1:27017 — connect ECONNREFUSED
        Running on JSON files instead. Start MongoDB and restart to use the database.
   Database    : JSON files (MongoDB unreachable)
```

After you finish this guide, that same line becomes:

```
   Database    : MongoDB — counselconnect at mongodb://127.0.0.1:27017
                 21 collections, 198 documents
```

**Nothing in the project needs changing.** Install MongoDB, restart the
backend, and it switches over on its own and copies your existing data in.

---

## Step 0 — Check your Windows version

MongoDB 8.0 needs **64-bit Windows 11** (or Windows Server 2022).

Press `Windows + R`, type `winver`, press Enter. If it says Windows 11, you're
fine. On Windows 10, install **MongoDB 7.0** instead — pick it from the Version
dropdown in Step 1. Everything else in this guide is identical.

---

## Step 1 — Download the installer

1. Go to **<https://www.mongodb.com/try/download/community>**
2. Set the three dropdowns:
   - **Version** — the current release (8.0 or newer). On Windows 10, choose 7.0.
   - **Platform** — `Windows`
   - **Package** — `msi`   ← this matters, don't pick the ZIP
3. Click **Download**

You'll get a file like `mongodb-windows-x86_64-8.0.x-signed.msi` (~350 MB) in
your Downloads folder.

---

## Step 2 — Run the installer

Double-click the `.msi`. Then, screen by screen:

| Screen | What to do |
|---|---|
| **Welcome** | Click **Next** |
| **License Agreement** | Tick *I accept*, click **Next** |
| **Choose Setup Type** | Click **Complete** (not Custom) |
| **Service Configuration** | ⚠️ **The important one.** Leave **"Install MongoD as a Service"** ticked. Leave **"Run service as Network Service user"** selected. Leave *Service Name* as `MongoDB`. Don't change the Data or Log directories. Click **Next** |
| **Install MongoDB Compass** | ⚠️ **Leave this ticked.** Compass is the app you'll show your reviewer. Click **Next** |
| **Ready to install** | Click **Install**. Approve the Windows admin prompt |
| **Finished** | Click **Finish** |

Compass may open by itself at the end. That's fine — leave it open.

### Why "Install as a Service" matters

It means MongoDB starts automatically with Windows and stays running in the
background. Without it you'd have to open a terminal and start `mongod.exe`
manually every single time before running the project — easy to forget in front
of a reviewer.

---

## Step 3 — Confirm MongoDB is running

Pick either check.

**The easy one — Compass:**

1. Open **MongoDB Compass** (Start menu)
2. In the connection box, type `mongodb://localhost:27017`
3. Click **Connect**

If you land on a screen listing `admin`, `config`, `local` — it's working. Those
three are MongoDB's own databases. Yours will appear after Step 5.

**Or via Services:**

Press `Windows + R`, type `services.msc`, Enter. Find **MongoDB Server** in the
list. Status should read **Running**, Startup Type **Automatic**.

If it's not running: right-click it → **Start**.

---

## Step 4 — Install the project's database driver

Open a terminal in the project folder:

```powershell
cd "C:\Users\fsarg\OneDrive\Desktop\Major Project Final\backend"
npm install
```

This pulls in the `mongodb` package that the backend now needs. Takes a few
seconds.

---

## Step 5 — Start the backend (this is the migration)

```powershell
npm start
```

Watch the terminal. On this **first** run it creates the database, creates all
21 collections and copies everything from `backend/data/*.json` into them:

```
[store] imported 198 document(s) from JSON into MongoDB:
        admins                     2
        appointments              11
        calls                      7
        doctors                    7
        ...

🌿 CounselConnect API
   Environment : development
   Port        : 5000
   Database    : MongoDB — counselconnect at mongodb://127.0.0.1:27017
                 21 collections, 198 documents
                 open Compass at mongodb://127.0.0.1:27017 to browse them
```

Seeing `Database : MongoDB` is the confirmation. **You're done migrating.**

On every run after this it just connects — it will **not** overwrite your live
data with the old JSON snapshot.

---

## Step 6 — See your tables in Compass

1. Open **MongoDB Compass**
2. Connect to `mongodb://localhost:27017`
3. In the left sidebar, click **`counselconnect`**

You'll see all 21 collections:

```
admins                  applications            appointments
availability            calls                   crisis-log
doctors                 documents               feedback
journal                 logins                  messages
moods                   notes                   notification-reads
notifications           notifications-read      payments
platform-notifications  settings                users
```

Click **`users`** — you'll see your four real accounts. Click **`appointments`**
— your eleven bookings. Click **`doctors`** — the seven counselors.

Each document looks like this, with the record's own `id` reused as MongoDB's
`_id` so it reads cleanly:

```json
{
  "_id": "d1",
  "id": "d1",
  "name": "Dr. Sarah Chen",
  "counselorId": "c1",
  "email": "sarah.chen@counselconnect.com",
  "specialty": "Anxiety & Stress",
  ...
}
```

---

## Showing it to your reviewer

This is the bit worth rehearsing, because it's the convincing part:

1. Have **Compass open on the `moods` collection** on one side of the screen
2. Have the **app open** on the other side, signed in as a user
3. Log a mood in the app
4. Click **Refresh** (the ↻ button) in Compass
5. The new document appears

Same trick works with `appointments` (book a session), `feedback` (leave a
review), or `platform-notifications` (send a broadcast from the admin panel).
It proves the app is genuinely writing to MongoDB, not just displaying it.

You can also open <http://localhost:5000/api/health> in a browser — it reports
the engine, database name, collection count and document count as JSON.

---

## Useful commands

Run these from `backend`:

```powershell
npm run db:status          # connection + a document count for every collection
npm start                  # start the backend
npm run seed               # recreate the demo logins
npm run db:import          # re-import the JSON files into empty collections
npm run db:import -- --force   # force the JSON snapshot back over everything
```

`npm run db:status` is the quickest pre-demo check — it prints a table of every
collection and how many documents it holds.

---

## Troubleshooting

### "Running on JSON files instead" still appears after installing

MongoDB isn't actually running. Open `services.msc`, find **MongoDB Server**,
right-click → **Start**. Then restart the backend.

Or from an **Administrator** PowerShell:

```powershell
net start MongoDB
```

### `connect ECONNREFUSED 127.0.0.1:27017`

Same cause — the server is installed but stopped. See above.

### Compass connects, but there's no `counselconnect` database

MongoDB only creates a database once something is written to it. Run
`npm start` in `backend` once, then hit Refresh in Compass.

### `Cannot find module 'mongodb'`

You skipped Step 4. Run `npm install` inside `backend`.

### Port 27017 already in use

You have an older MongoDB already running — which is fine, the project will
just use it. If you'd rather point at a different port, edit `backend\.env`:

```ini
MONGODB_URI=mongodb://127.0.0.1:27018
```

### I want to start the database completely fresh

In Compass, right-click the `counselconnect` database → **Drop Database**. Then:

```powershell
npm run db:import
```

Your JSON files under `backend\data` are still the original snapshot, so
nothing is lost.

### `mongosh` isn't recognised

The MSI installer does **not** include the MongoDB shell any more — it's a
separate download. You don't need it for this project; Compass does everything.
If you want it anyway: <https://www.mongodb.com/docs/mongodb-shell/install/>

---

## If you'd rather not install anything: MongoDB Atlas

If installing locally is a problem, MongoDB's free cloud tier works with no
code changes:

1. Sign up at <https://www.mongodb.com/cloud/atlas/register>
2. Create a free **M0** cluster
3. Add a database user, and allow access from your IP (or `0.0.0.0/0` for a demo)
4. Copy the connection string and put it in `backend\.env`:

```ini
MONGODB_URI=mongodb+srv://yourUser:yourPassword@cluster0.xxxxx.mongodb.net
MONGODB_DB=counselconnect
```

5. `npm start`

Compass connects to that same string, so the reviewer demo is identical. The
trade-off is that it needs internet during the demo — a local install doesn't.

---

## What actually changed in the project

Nothing you have to configure. For reference:

| File | What it does |
|---|---|
| `backend/config/db.config.js` | Connection URI, database name, timeout |
| `backend/utils/mongoStore.utils.js` | The MongoDB engine |
| `backend/utils/fileStore.utils.js` | Same functions the services always called, now backed by MongoDB |
| `backend/scripts/db-status.js` | `npm run db:status` |
| `backend/scripts/db-import.js` | `npm run db:import` |
| `backend/.env` | `MONGODB_URI`, `MONGODB_DB`, `MONGODB_REQUIRED` |
| `DATABASE.md` | The technical write-up of how storage works |

The JSON files in `backend/data` are **kept but no longer used** once MongoDB
is running. Think of them as the backup you migrated from — don't delete them
until you're happy everything works.

---

Sources for the installation steps:
- [Install MongoDB Community Edition on Windows — MongoDB Manual 8.0](https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-on-windows/)
- [MongoDB Download Center](https://www.mongodb.com/try/download/community)
- [Install mongosh](https://www.mongodb.com/docs/mongodb-shell/install/)
