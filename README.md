# JMS Dashboards — Secure Backend

This replaces the old GitHub Pages setup (static HTML with the data embedded
in the page, guarded only by a client-side JavaScript password check) with a
real server-side login. The password is checked on a server; the dashboard
data is never sent to a browser that hasn't proven it knows the password.
Anyone can still View Source on the old GitHub Pages files and read the data —
that's not possible here.

Cost: **$0/month**. No domain purchase. Runs on Vercel's free "Hobby" tier at
a free `*.vercel.app` subdomain.

---

## 1. What changed vs. the old GitHub Pages site

| | Old (GitHub Pages) | New (this project) |
|---|---|---|
| Hosting | GitHub Pages (static only) | Vercel (static + serverless functions) |
| Data location | Embedded directly in the HTML `<script>` | Server-side JSON files, released only after login |
| Password check | In the browser's JavaScript (bypassable via View Source) | On the server, before any data is sent |
| Session | None — just a JS flag that resets on page reload | Signed, expiring cookie (12-hour login) |

Your day-to-day workflow (send me a new xlsx export, I update the numbers)
stays the same. The only difference is *what* I hand back to you at the end —
see **Section 4**.

---

## 2. One-time setup (15 minutes)

### Step A — Create a free Vercel account
1. Go to vercel.com and sign up (you can use your GitHub login — this does
   **not** require a paid GitHub plan or a private repo).
2. This is free forever for a project like this one (personal/low-traffic
   use fits well within Vercel's free Hobby tier limits).

### Step B — Push this project to a GitHub repo
1. Create a **new** GitHub repo (can stay public or private — it no longer
   matters, since the actual data files aren't readable without logging in
   through the deployed site; more on that in Section 5).
2. Push the contents of this `jms-secure` folder to that repo (all of
   `api/`, `data/`, `public/`, `package.json`, `vercel.json`, this
   `README.md`).

### Step C — Import the repo into Vercel
1. In Vercel: **Add New → Project → Import Git Repository** → select the
   repo from Step B.
2. Leave all build settings on their defaults — no framework preset needed,
   no build command needed. Click **Deploy**.
3. Vercel will give you a free URL like `jms-dashboards.vercel.app` (you can
   rename the project in Vercel's settings to change the subdomain — still
   free, still no domain purchase).

### Step D — Set your two secrets
In the Vercel project: **Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `ACCESS_PASSWORD` | Whatever password you want to log in with. Pick something you haven't used anywhere else — this is now the *only* thing standing between the public and your data, so make it long and unique (e.g. a 16+ character passphrase, not a dictionary word). |
| `SESSION_SECRET` | A long random string used to cryptographically sign login sessions. Generate one with the command below and paste the output in. Nobody needs to remember this one — it's not a password you type in, it's just a secret key. |

To generate a strong `SESSION_SECRET`, run this once on any computer with
Node installed (or ask me and I'll generate one for you):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

After adding both variables, go to **Deployments** and redeploy (or just
push a small commit) so the functions pick up the new environment variables.

### Step E — Test it
Visit `https://<your-project>.vercel.app/` — you'll land on a small page
linking to `/sales` and `/transfer`. Each one shows a login screen; enter the
`ACCESS_PASSWORD` you set. You should stay logged in for 12 hours before
needing to re-enter it.

---

## 3. Project structure

```
jms-secure/
├── api/
│   ├── _auth.js          shared session/token logic (not a route itself)
│   ├── login.js          POST /api/login  { password }  → sets session cookie
│   ├── sales-data.js     GET  /api/sales-data     → JSON, 401 if not logged in
│   └── transfer-data.js  GET  /api/transfer-data  → JSON, 401 if not logged in
├── data/
│   ├── sales-data.json       the actual sales dashboard numbers
│   └── transfer-data.json    the actual transfer tracker numbers
├── public/
│   ├── index.html         landing page (links to /sales and /transfer)
│   ├── sales/index.html   sales dashboard front-end (fetches /api/sales-data after login)
│   └── transfer/index.html  transfer tracker front-end (fetches /api/transfer-data after login)
├── package.json
├── vercel.json            routes /sales and /transfer to clean URLs
└── README.md               (this file)
```

Both dashboards share the same login and the same `ACCESS_PASSWORD` — one
password gets you into both.

---

## 4. How our daily update workflow changes

**Before:** you'd send me an xlsx export, I'd hand you back one or two
complete `index.html` files, and you'd upload those to GitHub yourself.

**Now:** you send me the xlsx export exactly the same way. I'll compute the
same deltas using the same filtering rules as always, but instead of editing
HTML, I'll update `data/sales-data.json` and/or `data/transfer-data.json` and
hand those back to you. You commit/push just those JSON file(s) to your
GitHub repo — Vercel auto-deploys within about a minute of the push, same as
GitHub Pages did. The HTML/CSS/JS files essentially never need to change
again unless you want a new feature or layout tweak.

If you'd rather I just tell you exactly what changed and you paste it in
yourself, that works too — the JSON files are plain, readable data, not
minified.

---

## 5. What this does and doesn't protect against

**Protects against:** anyone finding the URL and viewing your numbers without
the password — including via "View Source," browser dev tools, or search
engines. This is the gap the old site had and this one closes.

**Does not protect against:**
- Sharing the password with someone who shouldn't have it — the login is
  only as strong as the password's secrecy. Rotate `ACCESS_PASSWORD` in
  Vercel's dashboard any time you want to invalidate everyone's access.
- A sustained, distributed brute-force attack — there's a basic rate limiter
  (8 attempts per 5 minutes per IP) but it's not a substitute for a strong
  password.
- Someone with access to your GitHub repo's commit history — if the *old*
  repo ever had `master_orders.csv` or other raw exports committed to it,
  those are still recoverable from git history even after you stop updating
  them going forward. Worth a quick check (see below).

### Repo history check (still outstanding from the "quick wins" side)
You mentioned you weren't sure whether raw files like `master_orders.csv` or
processing scripts were ever pushed to `flbocateam.github.io`. Worth
confirming — if any of those were committed at any point, they're still
retrievable from that repo's history even if deleted today, since Git keeps
old commits by default. Options if that's the case: scrub history with a
tool like `git filter-repo`, or simplest, just start this new project in a
brand-new repo (which is what these instructions assume) and leave the old
one either deleted or stripped down to nothing sensitive.

---

## 6. Quick reference — routes

| Route | Purpose |
|---|---|
| `/` | landing page |
| `/sales` | sales dashboard (requires login) |
| `/transfer` | transfer tracker (requires login) |
| `/api/login` | POST — logs in, sets cookie |
| `/api/sales-data` | GET — sales JSON, 401 without valid session |
| `/api/transfer-data` | GET — transfer JSON, 401 without valid session |
