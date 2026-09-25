import { createClient } from "@/lib/supabase/server";
import { computeMetrics } from "./hackerrank";
import { contestAccount } from "./account";
import type {
  Campus,
  Subject,
  TrackerChallenge,
  TrackerContest,
  TrackerLeaderboardSnapshot,
} from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
}

export type DetailedRow = {
  campus: string;
  subject: string;
  contest: string;
  account: string;
  rank: number | null;
  username: string | null;
  score: number;
  max_score: number;
  pct_completion: number;
  time_hms: string | null;
};

export async function loadDetailedRows(
  supabase: SupabaseClient
): Promise<DetailedRow[]> {
  const [
    { data: campuses },
    { data: subjects },
    { data: contests },
    { data: snapshots },
    { data: challenges },
  ] = await Promise.all([
    supabase.from("campuses").select("*").order("name"),
    supabase.from("subjects").select("*").order("name"),
    supabase.from("tracker_contests").select("*"),
    supabase
      .from("tracker_leaderboard_snapshots")
      .select("*")
      .order("fetched_at", { ascending: false }),
    supabase.from("tracker_challenges").select("*").order("sequence"),
  ]);

  const campusList = (campuses ?? []) as Campus[];
  const subjectList = (subjects ?? []) as Subject[];
  const contestList = (contests ?? []) as TrackerContest[];
  const snapshotList = (snapshots ?? []) as TrackerLeaderboardSnapshot[];
  const challengeList = (challenges ?? []) as TrackerChallenge[];

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

  const subjectsByCampus = new Map<string, Subject[]>();
  for (const s of subjectList) {
    const list = subjectsByCampus.get(s.campus_id) ?? [];
    list.push(s);
    subjectsByCampus.set(s.campus_id, list);
  }
  const contestsBySubject = new Map<string, TrackerContest[]>();
  for (const c of contestList) {
    const list = contestsBySubject.get(c.subject_id) ?? [];
    list.push(c);
    contestsBySubject.set(c.subject_id, list);
  }

  const out: DetailedRow[] = [];
  for (const campus of campusList) {
    const cs = (subjectsByCampus.get(campus.id) ?? []).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const subject of cs) {
      const ks = (contestsBySubject.get(subject.id) ?? []).sort((a, b) =>
        (a.display_name || a.slug).localeCompare(b.display_name || b.slug)
      );
      for (const contest of ks) {
        if (!contest.last_fetched_at) continue;
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
        for (const r of rows) {
          out.push({
            campus: campus.name,
            subject: subject.name,
            contest: contest.display_name || contest.slug,
            account: contestAccount(contest) ?? "",
            rank: r.rank,
            username: r.hacker,
            score: r.score,
            max_score: r.max_score,
            pct_completion: r.pct_completion,
            time_hms: r.time_hms,
          });
        }
      }
    }
  }
  return out;
}

export function csvResponse(body: string, filename: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function xlsxResponse(body: Buffer, filename: string) {
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
