-- Fix `participants` in tracker_subject_aggregates to mean "distinct students
-- who appear in at least one leaderboard for this subject", not "sum of
-- leaderboard rows across contests" — the latter double-counted every student
-- once per contest they participated in, making participation rate exceed 100%
-- and get visually clamped in the tracker charts.

create or replace view public.tracker_subject_aggregates
with (security_invoker = on) as
with contest_max as (
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
),
subject_participants as (
  -- Distinct students who appear on ANY leaderboard for this subject.
  -- Case-insensitive match against the roster mirrors the unique index on
  -- tracker_students (subject_id, lower(hackerrank_username)) — so an
  -- attendee whose username differs only in case still counts as one.
  select
    s.id as subject_id,
    count(distinct lower(lb.hackerrank_username))::int as participants
  from public.subjects s
  left join public.tracker_contests c on c.subject_id = s.id
  left join latest_batch lb           on lb.contest_id = c.id
  group by s.id
)
select
  s.id       as subject_id,
  s.campus_id,
  s.name     as subject_name,
  coalesce(e.student_count, 0)  as student_count,
  coalesce(sp.participants, 0)  as participants,
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
left join enrolled e                on e.subject_id = s.id
left join subject_participants sp   on sp.subject_id = s.id
left join public.tracker_contests c on c.subject_id = s.id
left join latest_batch lb           on lb.contest_id = c.id
left join contest_max cm            on cm.contest_id = c.id
group by s.id, s.campus_id, s.name, e.student_count, sp.participants;

grant select on public.tracker_subject_aggregates to authenticated;
