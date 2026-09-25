-- Explicit HackerRank-account mapping per contest, so an admin can override
-- the slug-based auto-detection (contests whose slug lacks a "101"/"301"
-- token used to fall through to "no account" silently).
-- Null means "auto-detect from slug" (the existing behavior).

alter table public.tracker_contests
  add column if not exists hr_account text
    check (hr_account is null or hr_account in ('101', '301'));

create index if not exists tracker_contests_hr_account_idx
  on public.tracker_contests (hr_account)
  where hr_account is not null;
