import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadContestMetrics } from "@/lib/tracker/queries";
import { csvResponse, toCsv } from "@/lib/tracker/exports";
import type { TrackerContest } from "@/types/database";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  await requireAdmin();
  const { contestId } = await params;
  const url = new URL(request.url);
  const rawCutoff = url.searchParams.get("cutoff");
  let cutoffOverride: number | null | undefined = undefined;
  if (rawCutoff !== null) {
    const s = rawCutoff.trim();
    cutoffOverride = s === "" ? null : /^\d+$/.test(s) ? Number(s) : undefined;
  }

  const supabase = await createClient();
  const { data: contest } = await supabase
    .from("tracker_contests")
    .select("*")
    .eq("id", contestId)
    .single();
  if (!contest) {
    redirect(`/tracker?error=${encodeURIComponent("Contest not found.")}`);
  }
  const c = contest as TrackerContest;
  const { rows } = await loadContestMetrics(supabase, c, cutoffOverride);
  if (!rows.length) {
    redirect(
      `/tracker/contest/${c.id}?error=${encodeURIComponent(
        "Nothing to export yet — fetch this contest first."
      )}`
    );
  }
  const out: unknown[][] = [
    ["Rank", "Username", "Score", "Max", "% Completion", "Time (H:M:S)"],
  ];
  for (const r of rows) {
    out.push([
      r.rank,
      r.hacker,
      r.score,
      r.max_score,
      `${(r.pct_completion * 100).toFixed(1)}%`,
      r.time_hms,
    ]);
  }
  return csvResponse(toCsv(out), `${c.slug}_metrics.csv`);
}
