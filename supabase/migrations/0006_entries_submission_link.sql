-- Admin can attach a link to their work (e.g. drive folder, doc URL)
-- when marking an entry as done. Faculty sees it while reviewing.
alter table public.entries
  add column if not exists submission_link text;
