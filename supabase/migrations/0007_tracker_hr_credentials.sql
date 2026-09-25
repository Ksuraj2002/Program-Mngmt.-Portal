-- Stored HackerRank session cookies for the daily auto-refresh cron.
-- The cookie is encrypted with AES-256-GCM at the app layer using HR_COOKIE_ENC_KEY
-- (see src/lib/tracker/crypto.ts). We store the ciphertext blob only; the DB
-- never sees plaintext. Row per HR account ("101", "301").

create table if not exists public.tracker_hr_credentials (
  account text primary key,
  cookie_ciphertext text not null,
  last_refresh_ok_at timestamptz,
  last_refresh_error text,
  status text not null default 'active' check (status in ('active', 'expired')),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

alter table public.tracker_hr_credentials enable row level security;

-- Admins only, both read and write. The cron endpoint uses the service-role
-- client and bypasses RLS entirely.
create policy "tracker_hr_credentials_admin_all" on public.tracker_hr_credentials
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
