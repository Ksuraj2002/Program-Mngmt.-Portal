-- Perf-oriented view: per-subject aggregates computed in Postgres so the
-- tracker landing page doesn't pull every leaderboard snapshot and every
-- challenge into Node just to compute rollups. `security_invoker = on`
-- makes the view honor the caller's RLS policies (Supabase requires this
-- pattern; without it a view runs as its owner and bypasses RLS).

create or replace view public.tracker_subject_aggregates
with (security_invoker = on) as
with contest_max as (
  -- max_score for each contest, respecting its lecture_cutoff_challenge_count.
  select
    c.id             as contest_id,
    c.subject_id,
    coalesce(sum(case
      when c.lecture_cutoff_challenge_count is null
        or ch.sequence < c.lecture_cutoff_challenge_count
      then ch.max_score
      else 0
    end), 0) as max_score
  from public.tracker_contests c
  left join public.tracker_challenges ch on ch.contest_id = c.id
  group by c.id, c.subject_id
),
latest_batch as (
  -- All rows from the latest fetch of each contest.
  select ls.*
  from public.tracker_leaderboard_snapshots ls
  join (
    select contest_id, max(fetched_at) as fa
    from public.tracker_leaderboard_snapshots
    group by contest_id
  ) m on m.contest_id = ls.contest_id and m.fa = ls.fetched_at
),
enrolled as (
  select subject_id, count(*)::int as student_count
  from public.tracker_students
  group by subject_id
)
select
  s.id       as subject_id,
  s.campus_id,
  s.name     as subject_name,
  coalesce(e.student_count, 0)  as student_count,
  count(lb.total_score)::int    as participants,
  round(coalesce(avg(lb.total_score), 0)::numeric, 1) as avg_score,
  coalesce(max(lb.total_score), 0) as top_score,
  coalesce(min(lb.total_score), 0) as min_score,
  round(
    coalesce(
      percentile_cont(0.5) within group (order by lb.total_score),
      0
    )::numeric,
    1
  ) as median_score,
  round(
    coalesce(
      avg(
        case when cm.max_score > 0
          then lb.total_score::numeric / cm.max_score
          else 0
        end
      ),
      0
    ) * 100,
    1
  ) as avg_pct_completion,
  (select count(*)::int from public.tracker_contests c where c.subject_id = s.id) as contest_count
from public.subjects s
left join enrolled e            on e.subject_id = s.id
left join public.tracker_contests c on c.subject_id = s.id
left join latest_batch lb       on lb.contest_id = c.id
left join contest_max cm        on cm.contest_id = c.id
group by s.id, s.campus_id, s.name, e.student_count;

grant select on public.tracker_subject_aggregates to authenticated;
