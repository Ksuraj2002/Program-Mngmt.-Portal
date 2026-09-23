-- Mirai School of Technology — HackerRank tracker tables.
-- Attaches contests/rosters/leaderboard snapshots to the same
-- campuses/subjects the portal already manages.

create table if not exists public.tracker_contests (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  slug text not null,
  display_name text,
  lecture_cutoff_challenge_count int,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (subject_id, slug)
);

create table if not exists public.tracker_challenges (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.tracker_contests (id) on delete cascade,
  hr_challenge_id text not null,
  name text,
  max_score numeric not null default 0,
  sequence int not null,
  unique (contest_id, hr_challenge_id)
);

create table if not exists public.tracker_students (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text,
  hackerrank_username text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists tracker_students_subject_username_lower_uq
  on public.tracker_students (subject_id, lower(hackerrank_username));

create table if not exists public.tracker_leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.tracker_contests (id) on delete cascade,
  hackerrank_username text not null,
  hackerrank_hacker_id text,
  total_score numeric,
  rank int,
  time_taken numeric,
  fetched_at timestamptz not null default now()
);

create index if not exists tracker_contests_subject_id_idx
  on public.tracker_contests (subject_id);
create index if not exists tracker_challenges_contest_id_idx
  on public.tracker_challenges (contest_id);
create index if not exists tracker_students_subject_id_idx
  on public.tracker_students (subject_id);
create index if not exists tracker_leaderboard_snapshots_contest_fetched_idx
  on public.tracker_leaderboard_snapshots (contest_id, fetched_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security. Any signed-in staff can read; only admins mutate.
-- ---------------------------------------------------------------------------

alter table public.tracker_contests enable row level security;
alter table public.tracker_challenges enable row level security;
alter table public.tracker_students enable row level security;
alter table public.tracker_leaderboard_snapshots enable row level security;

create policy "tracker_contests_select_authenticated" on public.tracker_contests
  for select to authenticated using (true);
create policy "tracker_contests_write_admin" on public.tracker_contests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tracker_challenges_select_authenticated" on public.tracker_challenges
  for select to authenticated using (true);
create policy "tracker_challenges_write_admin" on public.tracker_challenges
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tracker_students_select_authenticated" on public.tracker_students
  for select to authenticated using (true);
create policy "tracker_students_write_admin" on public.tracker_students
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "tracker_leaderboard_snapshots_select_authenticated" on public.tracker_leaderboard_snapshots
  for select to authenticated using (true);
create policy "tracker_leaderboard_snapshots_write_admin" on public.tracker_leaderboard_snapshots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
