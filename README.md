# SchoolAgenda — Setup & Deployment Guide

A free, full-stack school assessment calendar that lets teachers coordinate exams,
and gives students and parents a clear view of upcoming assessments with conflict warnings.

## Tech stack (all free)
- **React + Vite** — frontend
- **Supabase** — database, auth, row-level security (free tier: 500MB DB, 50k MAU)
- **Vercel or Netlify** — hosting (free tier, auto-deploy from GitHub)

---

## Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a name, password, and region close to your users
3. Wait ~2 minutes for it to spin up

---

## Step 2 — Run the SQL schema

1. In your Supabase dashboard, go to **SQL Editor → New query**
2. Paste the entire contents of `supabase_schema.sql`
3. Click **Run** — this creates all tables, RLS policies, and seed data

---

## Step 3 — Get your API keys

In Supabase → **Settings → API**, copy:
- **Project URL** (looks like `https://xxxx.supabase.co`)
- **anon / public key** (the long JWT string)

---

## Step 4 — Set up the React app locally

```bash
# Clone or download this folder, then:
cd schoolagenda
npm install

# Create your env file
cp .env.example .env.local

# Edit .env.local and paste your Supabase URL and anon key
nano .env.local   # or open in your editor

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Step 5 — Create your first admin user

1. Go to http://localhost:5173/signup
2. Sign up with any email (role doesn't matter — you'll promote it manually)
3. Click the confirmation link in your email
4. In Supabase → **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'admin' where id = '<your-user-uuid>';
   ```
   You can find your UUID in Supabase → **Authentication → Users**

---

## Step 6 — Deploy to Vercel (free)

1. Push the `schoolagenda` folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Select your repo
4. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click **Deploy** — done! You get a free `*.vercel.app` URL

**Or Netlify:**
1. Go to [netlify.com](https://netlify.com) → Add new site → Import from Git
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Add the same two environment variables under Site settings → Environment variables

---

## Step 7 — Onboard your school

### Admin workflow
1. Sign in as admin → School setup
2. Add grades (e.g. "9A", "10B")
3. Add subjects for each grade
4. Ask teachers to sign up at `/signup` with role = Teacher
5. Assign each teacher to their subjects in the admin panel

### Teacher workflow
1. Sign up at `/signup` → role: Teacher
2. Wait for admin to assign subjects
3. Sign in → Calendar → click **Add event**
4. Can only add events for assigned subjects

### Student / Parent workflow
1. Sign up at `/signup` → select role and grade
2. See their grade's calendar with conflict warnings automatically

---

## Roles & permissions summary

| Action | Admin | Teacher | Student | Parent |
|--------|-------|---------|---------|--------|
| Add/edit/delete events | ✓ (all) | ✓ (own subjects only) | ✗ | ✗ |
| View events | All grades | Their subjects | Own grade | Own grade |
| Manage grades/subjects | ✓ | ✗ | ✗ | ✗ |
| Assign teachers | ✓ | ✗ | ✗ | ✗ |

All permissions are enforced server-side via Supabase Row-Level Security —
not just in the UI. A teacher literally cannot write to the database for a subject
they are not assigned to.

---

## Project structure

```
schoolagenda/
├── supabase_schema.sql       ← Run this in Supabase SQL Editor
├── .env.example              ← Copy to .env.local and fill in
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx
    ├── App.jsx               ← Routing
    ├── index.css             ← Global styles
    ├── lib/
    │   └── supabase.js       ← Supabase client
    ├── hooks/
    │   └── useAuth.jsx       ← Auth context (session, profile, signIn, signUp)
    ├── components/
    │   └── EventModal.jsx    ← Add/edit event form
    └── pages/
        ├── LoginPage.jsx
        ├── SignupPage.jsx
        ├── DashboardLayout.jsx  ← Sidebar + nav
        ├── CalendarPage.jsx     ← Monthly calendar with conflict detection
        ├── UpcomingPage.jsx     ← Chronological event list
        └── AdminPage.jsx        ← Grade / subject / assignment management
```

---

## Next steps (when ready to go beyond PoC)

- **Email notifications** — use Supabase Edge Functions + Resend (free tier) to email students when a new event is added
- **Conflict resolution suggestions** — show teachers which days are free for their grade
- **Mobile app** — the React app already works on mobile browsers; wrap with Capacitor for a native app
- **Custom domain** — Vercel and Netlify both support custom domains on the free plan
