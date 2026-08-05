# HOW TO RUN CounselConnect

**Read this first if you've just been sent the project zip.**

This project used to store its data in JSON files inside the folder. It now
uses **MongoDB**. That means there's a one-time setup on your machine before
the project will run properly — about 15 minutes, mostly downloading.

Don't worry: **your data is inside the zip.** Once MongoDB is installed, the
first time you start the backend it copies everything in automatically. You
don't have to import anything by hand.

---

## Part 1 — What you need to install

| Software | Do you have it? | Where |
|---|---|---|
| **Node.js** (v18 or newer) | Check: open Command Prompt, type `node -v` | <https://nodejs.org> — pick **LTS** |
| **MongoDB Community Server** | You probably don't | See Part 2 |
| **MongoDB Compass** | Comes free with the above | Ticked by default in the installer |

If `node -v` prints something like `v20.11.0`, Node is fine. If it says
"not recognized", install Node.js first and then restart your Command Prompt.

---

## Part 2 — Install MongoDB (the one-time bit)

### 2.1 Check your Windows version

Press `Windows + R`, type `winver`, press Enter.

- **Windows 11** → use MongoDB **8.0**
- **Windows 10** → use MongoDB **7.0** instead (same steps, just pick 7.0 in
  the Version dropdown)

### 2.2 Download

Go to **<https://www.mongodb.com/try/download/community>** and set:

- **Version** — 8.0 (or 7.0 on Windows 10)
- **Platform** — `Windows`
- **Package** — `msi` ← important, **not** the ZIP

Click **Download**. It's around 350 MB.

### 2.3 Run the installer

Double-click the downloaded `.msi` file, then:

| Screen | What to click |
|---|---|
| Welcome | **Next** |
| License Agreement | Tick *I accept*, **Next** |
| Choose Setup Type | **Complete** |
| **Service Configuration** | ⚠️ Leave **"Install MongoD as a Service"** ticked. Leave everything else as-is. **Next** |
| **Install MongoDB Compass** | ⚠️ Leave this **ticked**. **Next** |
| Ready to Install | **Install**, then approve the Windows prompt |
| Completed | **Finish** |

**Both of those ticked boxes matter:**

- *Install as a Service* means MongoDB starts automatically with Windows and
  runs quietly in the background — you never have to start it manually.
- *Compass* is the app you'll use to look at the database.

Compass may open on its own afterwards. That's fine.

### 2.4 Check it worked

Open **MongoDB Compass** from the Start menu. In the connection box type:

```
mongodb://localhost:27017
```

Click **Connect**. If you see a list containing `admin`, `config` and `local`,
MongoDB is installed and running. Those are MongoDB's own databases — ours
appears in Part 4.

---

## Part 3 — Set up the project

### 3.1 Unzip

Unzip the folder somewhere simple, like your Desktop. Avoid unzipping inside
another zip, and don't run it from inside the `.zip` preview window — actually
extract it.

### 3.2 Install the project's packages

You need to do this in **two** places.

Open Command Prompt, then:

```cmd
cd "C:\Users\<YourName>\Desktop\Major Project Final\backend"
npm install
```

Wait for it to finish, then:

```cmd
cd "C:\Users\<YourName>\Desktop\Major Project Final"
npm install
```

> **Tip:** to get the folder path without typing it, open the folder in File
> Explorer, click the address bar, copy it, and paste after `cd `.

If the zip already included `node_modules` folders, `npm install` will be quick
— run it anyway, it just checks everything is present.

---

## Part 4 — Run it

You need **two Command Prompt windows**, both left open.

### Window 1 — the backend (the API + database)

```cmd
cd "C:\Users\<YourName>\Desktop\Major Project Final\backend"
npm run dev
```

**On this very first run**, it creates the database and copies all the data
from the zip into MongoDB. You'll see something like:

```
[store] imported 198 document(s) from JSON into MongoDB:
        admins                     2
        appointments              11
        doctors                    7
        users                      4
        ...

🌿 CounselConnect API
   Environment : development
   Port        : 5000
   Database    : MongoDB — counselconnect at mongodb://127.0.0.1:27017
                 21 collections, 198 documents
```

**⚠️ Look at the line beginning `Database :`** — this is the single most
important line.

- `Database : MongoDB — counselconnect` ✅ everything is working
- `Database : JSON files (MongoDB unreachable)` ❌ MongoDB isn't running — see
  Troubleshooting below

### Window 2 — the frontend (the website)

Open a **new, separate** Command Prompt (leave the first one running):

```cmd
cd "C:\Users\<YourName>\Desktop\Major Project Final"
npm run dev
```

Then open **<http://localhost:5173>** in your browser.

### Shortcut

Instead of the two windows, you can double-click **`start-project.bat`** in the
project folder. It checks MongoDB and opens both windows for you.

---

## Part 5 — Log in

All three panels use the same login page:

| Panel | Email | Password |
|---|---|---|
| **User** | `asra@gmail.com` | `User@123` |
| **Counselor** | `sarah.chen@counselconnect.com` | `Doctor@123` |
| **Admin** | `admin@counselconnect.com` | `Admin@123` |

If the logins don't work, run this once in the `backend` folder:

```cmd
npm run seed
```

That recreates the demo accounts and prints every email and password.

---

## Part 6 — See the database in Compass

1. Open **MongoDB Compass**
2. Connect to `mongodb://localhost:27017`
3. Click **`counselconnect`** in the left sidebar

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

Click `users` to see the accounts, `appointments` for the bookings, `doctors`
for the counselors.

### Nice thing to try

Put Compass and the app side by side. Log a mood in the app, then click
**Refresh** (↻) in Compass on the `moods` collection — the new record appears.
That's proof the app is writing to MongoDB.

You can also open <http://localhost:5000/api/health> in a browser; it reports
the database name and how many documents are in it.

---

## Troubleshooting

### `Database : JSON files (MongoDB unreachable)`

MongoDB isn't running. Press `Windows + R`, type `services.msc`, find
**MongoDB Server**, right-click → **Start**. Then stop the backend (`Ctrl + C`)
and run `npm run dev` again.

Or, in a Command Prompt opened **as Administrator**:

```cmd
net start MongoDB
```

**This matters:** if you use the app while it says "JSON files", your work is
saved into the files instead of MongoDB — and it won't be merged in later.

### `'npm' is not recognized`

Node.js isn't installed, or the Command Prompt was open before you installed
it. Install Node.js, then close and reopen Command Prompt.

### `Cannot find module 'mongodb'` (or any other module)

You skipped `npm install`. Run it inside `backend`, and again in the main
project folder.

### `Error: listen EADDRINUSE :::5000` or `:::5173`

Something is already using that port — usually a previous copy still running.
Close the other Command Prompt windows and try again.

### Compass connects but there's no `counselconnect` database

You haven't started the backend yet. MongoDB only creates the database when
something writes to it. Run `npm run dev` in `backend`, then hit Refresh in
Compass.

### The website loads but everything is empty / errors everywhere

The backend isn't running. Check Window 1 — it should still be open and show
the API banner. Start it before the website.

### I want to wipe the database and start over

In Compass, right-click `counselconnect` → **Drop Database**. Then in
`backend`:

```cmd
npm run db:import
```

That re-imports the JSON files that came in the zip.

### `mongosh is not recognized`

You don't need it. The MongoDB installer doesn't include the shell any more;
Compass does everything required here.

---

## Quick reference

Run these from the **`backend`** folder:

```cmd
npm run dev          start the backend (auto-restarts when code changes)
npm run db:status    check the connection + count documents per collection
npm run seed         recreate the demo logins
npm run db:import    re-import the JSON files into empty collections
```

From the **main project folder**:

```cmd
npm run dev          start the website
```

---

## ⚠️ For whoever is SENDING the zip

**Read this before you zip and send.**

The JSON files in `backend/data` are no longer the live database — MongoDB is.
Those files are only a snapshot, and they go stale the moment you use the app.

**So before zipping, run this in the `backend` folder:**

```cmd
npm run db:export
```

It writes your current MongoDB data back into `backend/data/*.json`. Then zip
and send as usual, and the person unzipping gets everything.

**If you skip it**, they'll receive the data as it was on the day you migrated
to MongoDB and none of your work since.

You can safely leave `node_modules` out of the zip to keep it small — the
instructions above tell them to run `npm install`, which recreates it.
