import type { SupabaseClient } from "@supabase/supabase-js";
import { contestAccount, type HRAccount } from "./account";
import {
  fetchLeaderboard,
  fetchChallenges,
  HackerRankAuthError,
} from "./hackerrank";
import {
  getStoredCookie,
  markCookieExpired,
  markRefreshError,
  markRefreshOk,
} from "./credentials";
import type { Database, TrackerContest } from "@/types/database";

// Structurally accepts either the ssr server client or the admin service-role
// client — both are SupabaseClient<Database> under the hood.
export type AnySupabaseClient = SupabaseClient<Database>;

export async function refreshContest(
  supabase: AnySupabaseClient,
  contest: TrackerContest,
  cookie: string
): Promise<{ leaderboardCount: number; challengesCount: number }> {
  const [leaderboard, challenges] = await Promise.all([
    fetchLeaderboard(cookie, contest.slug),
    fetchChallenges(cookie, contest.slug),
  ]);

  const fetchedAt = new Date().toISOString();

  const seen = new Set<string>();
  const unique: typeof challenges = [];
  for (const c of challenges) {
    const id = String(c.id);
    if (seen.has(id)) continue;
    seen.add(id);
    unique.push(c);
  }

  const upserts: {
    contest_id: string;
    hr_challenge_id: string;
    name: string | null;
    max_score: number;
    sequence: number;
  }[] = unique.map((ch, idx) => ({
    contest_id: contest.id,
    hr_challenge_id: String(ch.id),
    name: ch.name ?? null,
    max_score: Number(ch.max_score ?? 0),
    sequence: idx,
  }));

  if (upserts.length) {
    const { error: chErr } = await supabase
      .from("tracker_challenges")
      .upsert(upserts, { onConflict: "contest_id,hr_challenge_id" });
    if (chErr) throw new Error(`Challenge write failed: ${chErr.message}`);
  }

  const snapshotRows = leaderboard.map((h) => ({
    contest_id: contest.id,
    hackerrank_username: h.hacker ?? "",
    hackerrank_hacker_id: h.hacker_id != null ? String(h.hacker_id) : null,
    total_score: Number(h.score ?? 0),
    rank: h.rank ?? null,
    time_taken: h.time_taken ?? null,
    fetched_at: fetchedAt,
  }));

  if (snapshotRows.length) {
    const { error: snapErr } = await supabase
      .from("tracker_leaderboard_snapshots")
      .insert(snapshotRows);
    if (snapErr) throw new Error(`Snapshot write failed: ${snapErr.message}`);
  }

  const { error: updErr } = await supabase
    .from("tracker_contests")
    .update({ last_fetched_at: fetchedAt })
    .eq("id", contest.id);
  if (updErr) throw new Error(`Contest update failed: ${updErr.message}`);

  return {
    leaderboardCount: leaderboard.length,
    challengesCount: unique.length,
  };
}

// Refresh every contest under one HR account using the stored cookie.
// Shared by the admin "Refresh now" button and the daily cron. On auth
// failure the cookie is marked expired so the homepage banner surfaces it.
export async function refreshAccountFromStorage(
  supabase: AnySupabaseClient,
  account: HRAccount
): Promise<{ ok: number; total: number; failed: string[]; authFailed: boolean }> {
  const cookie = await getStoredCookie(account);
  if (!cookie) {
    await markCookieExpired(account, "No cookie stored");
    return { ok: 0, total: 0, failed: [], authFailed: true };
  }

  const { data: contests } = await supabase
    .from("tracker_contests")
    .select("*");
  const scoped = ((contests ?? []) as TrackerContest[]).filter(
    (c) => contestAccount(c) === account
  );

  let ok = 0;
  const failed: string[] = [];
  let authFailed = false;
  for (const contest of scoped) {
    try {
      await refreshContest(supabase, contest, cookie);
      ok += 1;
    } catch (e) {
      if (e instanceof HackerRankAuthError) {
        authFailed = true;
        await markCookieExpired(account, e.message);
        failed.push(`${contest.slug} (auth: cookie expired)`);
        break;
      }
      failed.push(`${contest.slug} (${(e as Error).message})`);
    }
  }

  if (!authFailed) {
    if (failed.length === 0 && ok > 0) {
      await markRefreshOk(account);
    } else if (failed.length > 0) {
      await markRefreshError(account, failed.join("; "));
    }
  }

  return { ok, total: scoped.length, failed, authFailed };
}
