"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HR_ACCOUNTS, contestAccount, type HRAccount } from "@/lib/tracker/account";
import { fetchLeaderboard, fetchChallenges } from "@/lib/tracker/hackerrank";
import type { TrackerChallenge, TrackerContest } from "@/types/database";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

// Fetch a single contest's leaderboard + challenges and persist them.
// Caller guarantees admin. Cookie is caller-scoped, held in memory here,
// used only for the outbound calls, and discarded when this function
// returns — never persisted to the DB or session.
export async function refreshContest(
  supabase: SupabaseClient,
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

  const { data: existing } = await supabase
    .from("tracker_challenges")
    .select("*")
    .eq("contest_id", contest.id);

  const byHrId = new Map(
    ((existing ?? []) as TrackerChallenge[]).map((c) => [c.hr_challenge_id, c])
  );

  const upserts: {
    id?: string;
    contest_id: string;
    hr_challenge_id: string;
    name: string | null;
    max_score: number;
    sequence: number;
  }[] = [];
  unique.forEach((ch, idx) => {
    const hrId = String(ch.id);
    const existingRow = byHrId.get(hrId);
    upserts.push({
      id: existingRow?.id,
      contest_id: contest.id,
      hr_challenge_id: hrId,
      name: ch.name ?? null,
      max_score: Number(ch.max_score ?? 0),
      sequence: idx,
    });
  });

  if (upserts.length) {
    const { error: chErr } = await supabase
      .from("tracker_challenges")
      .upsert(upserts, { onConflict: "contest_id,hr_challenge_id" });
    if (chErr) throw new Error(`Challenge write failed: ${chErr.message}`);
  }

  const snapshotRows = leaderboard.map((h) => ({
    contest_id: contest.id,
    hackerrank_username: h.hacker ?? "",
    hackerrank_hacker_id:
      h.hacker_id != null ? String(h.hacker_id) : null,
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

export async function bulkFetchAccount(formData: FormData) {
  await requireAdmin();
  const account = String(formData.get("account") || "");
  const cookie = String(formData.get("cookie") || "").trim();

  if (!HR_ACCOUNTS.includes(account as HRAccount)) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Unknown HackerRank account "${account}".`
      )}`
    );
  }
  if (!cookie) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Paste the ${account} account's HackerRank cookie to refresh.`
      )}`
    );
  }

  const supabase = await createClient();
  const { data: contests } = await supabase
    .from("tracker_contests")
    .select("*");
  const scoped = ((contests ?? []) as TrackerContest[]).filter(
    (c) => contestAccount(c.slug) === (account as HRAccount)
  );
  if (!scoped.length) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `No contests mapped to the ${account} account.`
      )}`
    );
  }

  let ok = 0;
  const failed: string[] = [];
  for (const contest of scoped) {
    try {
      await refreshContest(supabase, contest, cookie);
      ok += 1;
    } catch (e) {
      failed.push(`${contest.slug} (${(e as Error).message})`);
    }
  }

  revalidatePath("/tracker");
  const summary = `Refreshed ${ok} of ${scoped.length} contests on the ${account} account.${
    failed.length ? ` Failures: ${failed.join("; ")}` : ""
  }`;
  redirect(`/tracker?flash=${encodeURIComponent(summary)}`);
}
