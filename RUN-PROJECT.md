# How to run CounselConnect

## Short answer to your question

**No — `npm run dev` does not start MongoDB.** But you don't need to start it
either.

MongoDB was installed as a **Windows service**, which means it starts by itself
when Windows boots and keeps running in the background. It is almost certainly
already running right now. Nothing in the project starts or stops it.

So your steps were right. Here they are in full.

---

## The routine

You need **two terminal windows**, both left open the whole time.

### Terminal 1 — backend

```powershell
cd "C:\Users\fsarg\OneDrive\Desktop\Major Project Final\backend"
npm run dev
```

### Terminal 2 — frontend

Open a **second, separate** window (don't reuse the first — the backend is
still running in it):

```powershell
cd "C:\Users\fsarg\OneDrive\Desktop\Major Project Final"
npm run dev
```

Then open <http://localhost:5173>.

Start the backend first. The frontend calls it, so if the API isn't up yet the
first page load will show errors until it is.

To stop either one: click that window and press `Ctrl + C`.

---

## The one line that tells you data is going to MongoDB

After `npm run dev` in the backend window, read the box it prints:

✅ **Good — everything is going to MongoDB:**

```
🌿 CounselConnect API
   Environment : development
   Port        : 5000
   Database    : MongoDB — counselconnect at mongodb://127.0.0.1:27017
                 21 collections, 198 documents
```

❌ **Bad — MongoDB is not running, data is going to JSON files:**

```
[store] MongoDB not reachable at mongodb://127.0.0.1:27017 — connect ECONNREFUSED
   Database    : JSON files (MongoDB unreachable)
```

**Check this line every time.** It is the only thing that tells you where your
data is landing. If you see the ❌ version, stop the backend (`Ctrl + C`), start
MongoDB, and run it again.

### Starting MongoDB by hand, if you ever need to

Open PowerShell **as Administrator**:

```powershell
net start MongoDB
```

Or: `Windows + R` → `services.msc` → find **MongoDB Server** → right-click →
**Start**.

---

## Before a demo — 20-second check

From the `backend` folder, with nothing else running:

```powershell
npm run db:status
```

It connects and prints a document count for every collection. If that works,
your demo will work.

---

## Common mistakes

| Mistake | What happens | Fix |
|---|---|---|
| Running both `npm run dev` in the same window | The second one won't start; the first is still occupying the terminal | Open a second window |
| Running the frontend's `npm run dev` inside `backend` | Starts the API again, not the website | The website's command runs from **Major Project Final**, not `backend` |
| Running the backend's command from **Major Project Final** | Starts Vite instead of the API | The API's command runs from **backend** |
| Closing a terminal window | That half of the app stops | Leave both open while you work |
| Not reading the `Database :` line | You may be writing to JSON without realising | Check it every time |

---

## Optional: one-click start

Double-click **`start-project.bat`** in this folder. It checks MongoDB is
running (and starts it if not), then opens both terminal windows for you.

If it says it can't start MongoDB, right-click the file → **Run as
administrator**.
