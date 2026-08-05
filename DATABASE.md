# CounselConnect — MongoDB setup

The backend now stores everything in **MongoDB**. All 21 collections are
browsable in MongoDB Compass on your machine.

---

## 1. Install and start MongoDB

**New to this? Follow [INSTALL-MONGODB.md](INSTALL-MONGODB.md) instead — it's a
full step-by-step Windows walkthrough.** This page is the short version.

Install **MongoDB Community Server**, leaving both *Install MongoD as a
Service* and *Install MongoDB Compass* ticked in the installer.

Then make sure the server is running:

| OS | Start it |
|---|---|
| Windows | Runs automatically after install. Otherwise `net start MongoDB`, or start **MongoDB Server** in `services.msc` |
| macOS | `brew services start mongodb-community` |
| Linux | `sudo systemctl start mongod` |

To check it's up, open **Compass** and connect to `mongodb://localhost:27017`.

> Note: the Windows `.msi` no longer bundles the `mongosh` shell — it's a
> separate download. You don't need it here; Compass covers everything.

---

## 2. Install the driver

```bash
cd backend
npm install
```

---

## 3. Start the backend

```bash
npm start
```

On the **first** run it creates the `counselconnect` database, creates all 21
collections, and copies everything from `backend/data/*.json` into them. You'll
see:

```
   Database    : MongoDB — counselconnect at mongodb://127.0.0.1:27017
                 21 collections, 198 documents
                 open Compass at mongodb://127.0.0.1:27017 to browse them
```

On later runs it just connects — **your data is never overwritten by the old
JSON snapshot.**

---

## 4. Show it in Compass

1. Open MongoDB Compass
2. Connect to `mongodb://127.0.0.1:27017`
3. Open the **`counselconnect`** database

You'll see every collection:

```
admins          applications     appointments    availability
calls           crisis-log       doctors         documents
feedback        journal          logins          messages
moods           notes            notification-reads
notifications   notifications-read               payments
platform-notifications           settings        users
```

Click `users` or `appointments` to see the documents. Use the app in another
window, hit **Refresh** in Compass, and the new rows appear — good for a live
demo.

---

## Handy commands

```bash
npm run db:status        # connection + a document count per collection
npm run db:export        # write MongoDB back out to backend/data/*.json
npm run db:import        # re-import the JSON files into empty collections
npm run db:import -- --force   # overwrite collections with the JSON snapshot
npm run seed             # recreate the demo logins
```

### Sharing the project

`backend/data/*.json` is a snapshot, not the live database, so it goes stale as
soon as you use the app. **Run `npm run db:export` before zipping the project**
— it writes the current database back into those files so they travel with the
zip. The person who unzips it gets everything imported on their first run.
See [HOW-TO-RUN.md](HOW-TO-RUN.md).

You can also check from the browser: <http://localhost:5000/api/health> reports
the engine, database name, collection count and document count.

---

## Configuration

`backend/.env`:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=counselconnect
MONGODB_REQUIRED=false
```

- **`MONGODB_URI`** — for MongoDB Atlas, paste the SRV connection string here
  instead; nothing else needs to change.
- **`MONGODB_REQUIRED`** — `false` (default) means that if MongoDB isn't
  running, the server still starts on the JSON files and warns you, so a
  stopped database never blocks a demo. Set it to `true` to make the server
  refuse to start instead.

---

## How it works

Each JSON file became a collection of the same name: `users.json` → `users`.

Documents keep their original `id` field and also use it as MongoDB's `_id`,
so they're easy to read in Compass and joins by id still work:

```json
{ "_id": "d1", "id": "d1", "name": "Dr. Sarah Chen", "counselorId": "c1", … }
```

A few stores are key/value maps rather than lists (`settings`, `messages`,
`availability`, `notification-reads`). Those store the map key as `_id`:

```json
{ "_id": "cbc9dcf0-…", "theme": "dark", "language": "English" }
```

Values that aren't objects — a plain array of ids, say — are held under a
`__value` field, because you can't spread an array into a document.

### The read path

Every service in this codebase reads the store **synchronously** — 403 call
sites across 25 files — while the MongoDB driver is asynchronous. Rather than
rewrite the entire backend at once, the store:

- loads all collections into memory when the server boots,
- serves reads from that copy (synchronous, as the services expect),
- applies writes to the copy immediately, then writes them through to MongoDB
  on a queue that preserves ordering.

MongoDB is the database of record: it is what gets loaded at startup and every
change lands in it. The in-memory copy is a read-through cache, which is sound
because a single Node process owns the data.

**The one limitation:** this assumes one backend process. If you ever run
several instances behind a load balancer, they would not see each other's
writes, and the services would need converting to `async`/`await` against the
driver directly.

The JSON files under `backend/data` are no longer written to. They're kept as
the pre-migration backup.
