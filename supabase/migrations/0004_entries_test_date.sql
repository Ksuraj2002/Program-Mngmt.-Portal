-- Add optional test_date column to entries table so tests can carry both
-- a due date and a scheduled test date.
alter table public.entries
  add column if not exists test_date date;
