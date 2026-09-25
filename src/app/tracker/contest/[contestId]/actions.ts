"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { refreshContest } from "@/lib/tracker/refresh";
import { HR_ACCOUNTS, type HRAccount } from "@/lib/tracker/account";
import type { TrackerContest } from "@/types/database";

export async function fetchOneContest(formData: FormData) {
  await requireAdmin();
  const contestId = String(formData.get("contestId"));
  const cookie = String(formData.get("cookie") || "").trim();
  const back = `/tracker/contest/${contestId}`;

  if (!cookie) {
    redirect(
      `${back}?error=${encodeURIComponent(
        "Paste your HackerRank cookie to fetch."
      )}`
    );
  }

  const supabase = await createClient();
  const { data: contest } = await supabase
    .from("tracker_contests")
    .select("*")
    .eq("id", contestId)
    .single();
  if (!contest) redirect(`/tracker?error=${encodeURIComponent("Contest not found.")}`);

  try {
    const { leaderboardCount, challengesCount } = await refreshContest(
      supabase,
      contest as TrackerContest,
      cookie
    );
    revalidatePath(back);
    redirect(
      `${back}?flash=${encodeURIComponent(
        `Fetched ${leaderboardCount} leaderboard rows and ${challengesCount} challenges.`
      )}`
    );
  } catch (e) {
    redirect(
      `${back}?error=${encodeURIComponent(
        `Fetch failed: ${(e as Error).message}`
      )}`
    );
  }
}

export async function updateContest(formData: FormData) {
  await requireAdmin();
  const contestId = String(formData.get("contestId"));
  const back = `/tracker/contest/${contestId}/edit`;

  const slug = String(formData.get("slug") || "").trim();
  const displayName =
    String(formData.get("display_name") || "").trim() || null;
  const cutoffRaw = String(formData.get("cutoff") || "").trim();
  const hrAccountRaw = String(formData.get("hr_account") || "").trim();

  if (!slug) {
    redirect(`${back}?error=${encodeURIComponent("Contest slug is required.")}`);
  }
  let cutoff: number | null = null;
  if (cutoffRaw) {
    if (!/^\d+$/.test(cutoffRaw)) {
      redirect(
        `${back}?error=${encodeURIComponent(
          "Challenge cutoff must be a whole number."
        )}`
      );
    }
    cutoff = Number(cutoffRaw);
  }
  let hrAccount: HRAccount | null = null;
  if (hrAccountRaw) {
    if (!HR_ACCOUNTS.includes(hrAccountRaw as HRAccount)) {
      redirect(
        `${back}?error=${encodeURIComponent(
          `Unknown HackerRank account "${hrAccountRaw}".`
        )}`
      );
    }
    hrAccount = hrAccountRaw as HRAccount;
  }

  const supabase = await createClient();
  const { data: contest, error } = await supabase
    .from("tracker_contests")
    .update({
      slug,
      display_name: displayName,
      lecture_cutoff_challenge_count: cutoff,
      hr_account: hrAccount,
    })
    .eq("id", contestId)
    .select()
    .single();

  if (error) {
    redirect(
      `${back}?error=${encodeURIComponent(
        error.code === "23505"
          ? `Slug "${slug}" is already mapped under this subject.`
          : error.message
      )}`
    );
  }

  revalidatePath(`/tracker/contest/${contestId}`);
  revalidatePath(back);
  redirect(`/tracker/subject/${(contest as TrackerContest).subject_id}`);
}
