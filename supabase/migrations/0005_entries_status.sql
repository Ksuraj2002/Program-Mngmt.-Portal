-- Add TPM / faculty review workflow to entries:
--   pending       -- TPM has to do the work
--   done_by_tpm   -- awaiting faculty review
--   approved      -- faculty signed off
-- change_request holds the faculty's feedback when they request changes.
alter table public.entries
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'done_by_tpm', 'approved')),
  add column if not exists change_request text;

create index if not exists entries_status_idx on public.entries (status);
