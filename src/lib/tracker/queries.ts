import { createClient } from "@/lib/supabase/server";
import { computeMetrics, summarize } from "./hackerrank";
import { HR_ACCOUNTS, contestAccount } from "./account";
import type {
  Campus,
  Subject,
  TrackerChallenge,
  TrackerContest,
  TrackerLeaderboardSnapshot,
  TrackerStudent,
} from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// ---------------------------------------------------------------------------
// Contest-scoped metrics — the leaderboard rows for a single contest, using
// its most recent fetch. Mirrors dashboard_app.load_contest_metrics.
// ---------------------------------------------------------------------------

export async function loadContestMetrics(
  supabase: SupabaseClient,
  contest: TrackerContest,
  cutoffOverride?: number | null
) {
  if (!contest.last_fetched_at) {
    return { rows: [], summary: null as ReturnType<typeof summarize> | null };
  }

  const effectiveCutoff =
    cutoffOverride === undefined
      ? contest.lecture_cutoff_challenge_count
      : cutoffOverride;

  const [{ data: snapshots }, { data: challenges }] = await Promise.all([
    supabase
      .from("tracker_leaderboard_snapshots")
      .select("*")
      .eq("contest_id", contest.id)
      .order("fetched_at", { ascending: false }),
    supabase
      .from("tracker_challenges")
      .select("*")
      .eq("contest_id", contest.id)
      .order("sequence"),
  ]);

  if (!snapshots || snapshots.length === 0) {
    return { rows: [], summary: null };
  }

  const latestAt = snapshots[0].fetched_at;
  const latest = snapshots.filter(
    (s: TrackerLeaderboardSnapshot) => s.fetched_at === latestAt
  );

  const { rows, summary } = computeMetrics(
    latest.map((s: TrackerLeaderboardSnapshot) => ({
      rank: s.rank,
      hackerrank_username: s.hackerrank_username,
      hackerrank_hacker_id: s.hackerrank_hacker_id,
      total_score: Number(s.total_score) || 0,
      time_taken: s.time_taken === null ? null : Number(s.time_taken),
    })),
    (challenges ?? []).map((c: TrackerChallenge) => ({
      hr_challenge_id: c.hr_challenge_id,
      max_score: Number(c.max_score),
      sequence: c.sequence,
    })),
    effectiveCutoff ?? null
  );

  return { rows, summary };
}

// ---------------------------------------------------------------------------
// Aggregations for the tracker landing page, campus page, and rollup —
// the same numbers the Flask app's compute_subject_stats + summarize produce.
// ---------------------------------------------------------------------------

export type SubjectStat = {
  scores: number[];
  pctCompletions: number[];
};

export type SubjectAggregate = {
  campus: Campus;
  subject: Subject;
  studentCount: number;
  contestCount: number;
  stat: SubjectStat;
};

export type CampusAggregate = {
  campus: Campus;
  subjectsCount: number;
  studentCount: number;
  stat: SubjectStat;
};

export async function loadTrackerAggregates(supabase: SupabaseClient) {
  const [
    { data: campuses },
    { data: subjects },
    { data: contests },
    { data: students },
    { data: snapshots },
    { data: challenges },
  ] = await Promise.all([
    supabase.from("campuses").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("tracker_contests").select("*"),
    supabase.from("tracker_students").select("*"),
    supabase
      .from("tracker_leaderboard_snapshots")
      .select("*")
      .order("fetched_at", { ascending: false }),
    supabase.from("tracker_challenges").select("*").order("sequence"),
  ]);

  const campusList = (campuses ?? []) as Campus[];
  const subjectList = (subjects ?? []) as Subject[];
  const contestList = (contests ?? []) as TrackerContest[];
  const studentList = (students ?? []) as TrackerStudent[];
  const snapshotList = (snapshots ?? []) as TrackerLeaderboardSnapshot[];
  const challengeList = (challenges ?? []) as TrackerChallenge[];

  // Group snapshots by contest, keep only the latest fetch batch per contest.
  const snapshotsByContest = new Map<string, TrackerLeaderboardSnapshot[]>();
  for (const s of snapshotList) {
    const list = snapshotsByContest.get(s.contest_id) ?? [];
    list.push(s);
    snapshotsByContest.set(s.contest_id, list);
  }
  for (const [cid, list] of snapshotsByContest.entries()) {
    const latestAt = list[0]?.fetched_at ?? null;
    snapshotsByContest.set(
      cid,
      latestAt ? list.filter((s) => s.fetched_at === latestAt) : []
    );
  }

  const challengesByContest = new Map<string, TrackerChallenge[]>();
  for (const c of challengeList) {
    const list = challengesByContest.get(c.contest_id) ?? [];
    list.push(c);
    challengesByContest.set(c.contest_id, list);
  }

  function statsForContest(contest: TrackerContest): SubjectStat {
    if (!contest.last_fetched_at) return { scores: [], pctCompletions: [] };
    const snaps = snapshotsByContest.get(contest.id) ?? [];
    const chs = challengesByContest.get(contest.id) ?? [];
    const { rows } = computeMetrics(
      snaps.map((s) => ({
        rank: s.rank,
        hackerrank_username: s.hackerrank_username,
        hackerrank_hacker_id: s.hackerrank_hacker_id,
        total_score: Number(s.total_score) || 0,
        time_taken: s.time_taken === null ? null : Number(s.time_taken),
      })),
      chs.map((c) => ({
        hr_challenge_id: c.hr_challenge_id,
        max_score: Number(c.max_score),
        sequence: c.sequence,
      })),
      contest.lecture_cutoff_challenge_count
    );
    return {
      scores: rows.map((r) => r.score),
      pctCompletions: rows.map((r) => r.pct_completion),
    };
  }

  function mergeStats(a: SubjectStat, b: SubjectStat): SubjectStat {
    return {
      scores: [...a.scores, ...b.scores],
      pctCompletions: [...a.pctCompletions, ...b.pctCompletions],
    };
  }

  const contestsBySubject = new Map<string, TrackerContest[]>();
  for (const c of contestList) {
    const list = contestsBySubject.get(c.subject_id) ?? [];
    list.push(c);
    contestsBySubject.set(c.subject_id, list);
  }

  const studentsBySubject = new Map<string, TrackerStudent[]>();
  for (const s of studentList) {
    const list = studentsBySubject.get(s.subject_id) ?? [];
    list.push(s);
    studentsBySubject.set(s.subject_id, list);
  }

  const campusById = new Map(campusList.map((c) => [c.id, c] as const));
  const subjectAggregates: SubjectAggregate[] = [];
  const perSubjectStat = new Map<string, SubjectStat>();

  for (const subj of subjectList) {
    const cs = contestsBySubject.get(subj.id) ?? [];
    let combined: SubjectStat = { scores: [], pctCompletions: [] };
    for (const c of cs) combined = mergeStats(combined, statsForContest(c));
    perSubjectStat.set(subj.id, combined);

    const campus = campusById.get(subj.campus_id);
    if (!campus) continue;
    subjectAggregates.push({
      campus,
      subject: subj,
      studentCount: (studentsBySubject.get(subj.id) ?? []).length,
      contestCount: cs.length,
      stat: combined,
    });
  }

  const campusAggregates: CampusAggregate[] = campusList.map((campus) => {
    const campusSubjects = subjectList.filter((s) => s.campus_id === campus.id);
    let combined: SubjectStat = { scores: [], pctCompletions: [] };
    let studentCount = 0;
    for (const subj of campusSubjects) {
      combined = mergeStats(combined, perSubjectStat.get(subj.id) ?? combined);
      studentCount += (studentsBySubject.get(subj.id) ?? []).length;
    }
    return {
      campus,
      subjectsCount: campusSubjects.length,
      studentCount,
      stat: combined,
    };
  });

  const accountCounts = HR_ACCOUNTS.map((account) => ({
    account,
    contestCount: contestList.filter((c) => contestAccount(c.slug) === account)
      .length,
  }));

  return {
    campusAggregates,
    subjectAggregates,
    accountCounts,
    campusList,
    subjectList,
    contestList,
    studentList,
  };
}

export function summarizeStat(stat: SubjectStat) {
  return summarize(stat.scores, stat.pctCompletions);
}
