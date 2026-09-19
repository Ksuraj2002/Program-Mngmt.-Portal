-- Mirai School of Technology portal — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'faculty' check (role in ('admin', 'faculty')),
  created_at timestamptz not null default now()
);

create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  campus_id uuid not null references public.campuses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (campus_id, name)
);

create table if not exists public.faculty_subjects (
  faculty_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (faculty_id, subject_id)
);

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  type text not null check (type in ('assignment', 'test')),
  title text not null,
  description text,
  due_date date not null,
  max_marks numeric,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists entries_subject_id_idx on public.entries (subject_id);
create index if not exists subjects_campus_id_idx on public.subjects (campus_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row whenever a new auth user is created.
-- New users default to 'faculty'; promote to 'admin' manually (see README).
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'faculty'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- keep entries.updated_at fresh
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists entries_set_updated_at on public.entries;
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper: is the current user an admin? SECURITY DEFINER so it can read
-- profiles without recursing into the RLS policy defined below.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.teaches_subject(target_subject_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.faculty_subjects
    where subject_id = target_subject_id and faculty_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.campuses enable row level security;
alter table public.subjects enable row level security;
alter table public.faculty_subjects enable row level security;
alter table public.entries enable row level security;

-- profiles: any signed-in staff member can see the directory; only admins
-- can change roles / names of others (self full_name edits are allowed too).
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_admin_or_self" on public.profiles
  for update to authenticated
  using (public.is_admin() or auth.uid() = id)
  with check (public.is_admin() or auth.uid() = id);

-- campuses: readable by any signed-in staff; only admins manage them.
create policy "campuses_select_authenticated" on public.campuses
  for select to authenticated using (true);

create policy "campuses_write_admin" on public.campuses
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- subjects: same pattern as campuses.
create policy "subjects_select_authenticated" on public.subjects
  for select to authenticated using (true);

create policy "subjects_write_admin" on public.subjects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- faculty_subjects: readable by any signed-in staff; only admins assign.
create policy "faculty_subjects_select_authenticated" on public.faculty_subjects
  for select to authenticated using (true);

create policy "faculty_subjects_write_admin" on public.faculty_subjects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- entries: readable by any signed-in staff (program management, not
-- student-facing). Faculty can create/edit/delete only for subjects they
-- are mapped to; admins can do anything.
create policy "entries_select_authenticated" on public.entries
  for select to authenticated using (true);

create policy "entries_insert_mapped_or_admin" on public.entries
  for insert to authenticated
  with check (public.is_admin() or public.teaches_subject(subject_id));

create policy "entries_update_mapped_or_admin" on public.entries
  for update to authenticated
  using (public.is_admin() or public.teaches_subject(subject_id))
  with check (public.is_admin() or public.teaches_subject(subject_id));

create policy "entries_delete_mapped_or_admin" on public.entries
  for delete to authenticated
  using (public.is_admin() or public.teaches_subject(subject_id));

-- ---------------------------------------------------------------------------
-- Seed the three campuses. Rename freely, or manage them from /admin later.
-- ---------------------------------------------------------------------------

insert into public.campuses (name) values
  ('Campus 1'),
  ('Campus 2'),
  ('Campus 3')
on conflict (name) do nothing;
