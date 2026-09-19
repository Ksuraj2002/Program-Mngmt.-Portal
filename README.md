# Mirai School of Technology — Portal

Internal program-management site: three campuses, each with subjects, where
faculty log in and add assignment/test entries (type, due date, details) for
the subjects they teach. Not student-facing.

Stack: Next.js (App Router) + Tailwind CSS + Supabase (Postgres, Auth, RLS).

## 1. Install Node.js

Install the LTS version from https://nodejs.org, then confirm:

```bash
node -v
npm -v
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create a Supabase project

1. Go to https://supabase.com, create a new project.
2. In **Project Settings → API**, copy the **Project URL**, **anon public
   key**, and **service_role key**.
3. Copy `.env.local.example` to `.env.local` and fill in those three values.

## 4. Run the database migration

Open the Supabase **SQL Editor** and run the contents of
[`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).

This creates the `profiles`, `campuses`, `subjects`, `faculty_subjects`, and
`entries` tables, sets up Row Level Security, seeds three placeholder
campuses ("Campus 1/2/3" — rename them from `/admin/campuses`), and installs
a trigger that auto-creates a `profiles` row (defaulting to role `faculty`)
whenever a new auth user is created.

## 5. Create the first admin account

New accounts default to the `faculty` role, and only admins can create
accounts from the app — so the very first admin has to be created by hand:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**,
   create yourself an account (email + password), with "Auto Confirm User"
   checked.
2. Back in the **SQL Editor**, run:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

3. Sign in at `/login` with that email/password — you'll land on the
   dashboard with an **Admin** link in the top nav.

From there, use **Admin → Faculty** to create every other account (it
generates a temporary password to hand to that person) and to promote
additional admins.

## 6. Run it

```bash
npm run dev
```

Visit http://localhost:3000.

## How it's organized

- **Admin → Campuses**: add/rename/delete the three campuses.
- **Admin → Subjects**: create subjects and map each one to a campus.
- **Admin → Faculty**: create faculty accounts and assign them to the
  subjects they teach (a faculty member can teach subjects across multiple
  campuses).
- **Dashboard → Campus → Subject**: anyone signed in can browse and see
  every assignment/test. The "Add assignment / test" form only appears for
  admins and for faculty mapped to that specific subject — enforced both in
  the UI and at the database level via Postgres Row Level Security, so it
  holds even if someone calls the API directly.

## Deploying

The app is a standard Next.js app — deploys to Vercel (or any Node host)
with the same three environment variables set in the hosting dashboard.
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client; it's only read in
server actions under `src/app/admin/faculty/actions.ts`.
