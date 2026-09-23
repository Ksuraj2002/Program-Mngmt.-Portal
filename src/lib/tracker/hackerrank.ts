// HackerRank REST endpoints for a contest's leaderboard + challenges.
// Auth is a session cookie the caller supplies (never persisted here or
// upstream) — mirrors the Flask app's behavior.

const BASE = "https://www.hackerrank.com/rest/contests";
const PAGE_SIZE = 100;

export type LeaderboardEntry = {
  rank?: number | null;
  hacker?: string | null;
  hacker_id?: number | string | null;
  score?: number | null;
  time_taken?: number | null;
};

export type ChallengeEntry = {
  id: number | string;
  name?: string | null;
  max_score?: number | null;
};

async function fetchPaginated<T>(cookie: string, path: string): Promise<T[]> {
  const collected: T[] = [];
  let page = 1;
  let total: number | null = null;
  while (total === null || collected.length < total) {
    const url = new URL(`${BASE}/${path}`);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(PAGE_SIZE));
    url.searchParams.set("offset", String(collected.length));

    const resp = await fetch(url, {
      headers: { Cookie: cookie, "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!resp.ok) {
      throw new Error(`HackerRank ${path} returned HTTP ${resp.status}`);
    }
    const payload = (await resp.json()) as {
      models?: T[];
      total?: number;
    };
    const models = payload.models;
    if (!Array.isArray(models)) {
      throw new Error(
        `Unexpected response shape from ${path}: ${JSON.stringify(
          Object.keys(payload)
        )}`
      );
    }
    if (models.length === 0) break;
    collected.push(...models);
    total = payload.total ?? collected.length;
    page += 1;
    if (page > 500) {
      throw new Error(`Stopped after 500 pages of ${path}`);
    }
  }
  return collected;
}

export async function fetchLeaderboard(cookie: string, slug: string) {
  return fetchPaginated<LeaderboardEntry>(cookie, `${slug}/leaderboard`);
}

export async function fetchChallenges(cookie: string, slug: string) {
  return fetchPaginated<ChallengeEntry>(cookie, `${slug}/challenges`);
}

export function formatHms(seconds: number | null | undefined) {
  if (seconds == null) return null;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const rem = s - h * 3600;
  const m = Math.floor(rem / 60);
  const ss = rem - m * 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

export type MetricRow = {
  rank: number | null;
  hacker: string | null;
  hacker_id: number | string | null;
  score: number;
  max_score: number;
  pct_completion: number;
  time_hms: string | null;
};

export type MetricSummary = {
  participants: number;
  avg_score: number;
  top_score: number;
  min_score: number;
  median_score: number;
  avg_pct_completion: number;
};

// The Flask app returns a different summary shape depending on caller;
// this one matches load_contest_metrics + summarize() combined.
export function summarize(
  scores: number[],
  pctCompletions: number[]
): MetricSummary {
  const mean = (xs: number[]) =>
    xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
  const median = (xs: number[]) => {
    if (!xs.length) return 0;
    const sorted = [...xs].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  return {
    participants: scores.length,
    avg_score: scores.length ? Math.round(mean(scores) * 10) / 10 : 0,
    top_score: scores.length ? Math.max(...scores) : 0,
    min_score: scores.length ? Math.min(...scores) : 0,
    median_score: scores.length ? Math.round(median(scores) * 10) / 10 : 0,
    avg_pct_completion: pctCompletions.length
      ? Math.round(mean(pctCompletions) * 100 * 10) / 10
      : 0,
  };
}

type StoredChallenge = {
  hr_challenge_id: string;
  max_score: number;
  sequence: number;
};

type StoredLeaderboardEntry = {
  rank: number | null;
  hackerrank_username: string;
  hackerrank_hacker_id: string | null;
  total_score: number;
  time_taken: number | null;
};

// Cutoff mode is a permanent APPROXIMATION for developer-account contests:
// HackerRank doesn't expose per-challenge score breakdowns for those, so
// a cutoff caps the max-score denominator only. The score numerator stays
// each student's whole-contest total. See the Flask app's compute_metrics
// docstring for the full explanation.
export function computeMetrics(
  leaderboard: StoredLeaderboardEntry[],
  challenges: StoredChallenge[],
  cutoff?: number | null
) {
  const sortedChallenges = [...challenges].sort(
    (a, b) => a.sequence - b.sequence
  );
  const inScope =
    cutoff == null ? sortedChallenges : sortedChallenges.slice(0, cutoff);
  const maxScore = inScope.reduce((sum, c) => sum + Number(c.max_score), 0);

  const rows: MetricRow[] = [...leaderboard]
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9))
    .map((h) => {
      const score = Number(h.total_score) || 0;
      return {
        rank: h.rank,
        hacker: h.hackerrank_username,
        hacker_id: h.hackerrank_hacker_id,
        score,
        max_score: maxScore,
        pct_completion: maxScore ? score / maxScore : 0,
        time_hms: formatHms(h.time_taken),
      };
    });

  const scores = rows.map((r) => r.score);
  const pctCompletions = rows.map((r) => r.pct_completion);
  return { rows, summary: summarize(scores, pctCompletions) };
}
