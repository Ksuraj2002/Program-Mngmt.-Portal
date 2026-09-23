import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadContestMetrics } from "@/lib/tracker/queries";
import { xlsxResponse } from "@/lib/tracker/exports";
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
  const { rows, summary } = await loadContestMetrics(
    supabase,
    c,
    cutoffOverride
  );
  if (!rows.length) {
    redirect(
      `/tracker/contest/${c.id}?error=${encodeURIComponent(
        "Nothing to export yet — fetch this contest first."
      )}`
    );
  }

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Completion");
  ws.addRow(["Rank", "Username", "Score", "Max", "% Completion", "Time (H:M:S)"]);
  for (const r of rows) {
    ws.addRow([
      r.rank,
      r.hacker,
      r.score,
      r.max_score,
      r.pct_completion,
      r.time_hms,
    ]);
  }
  ws.getColumn(5).numFmt = "0.0%";

  if (summary) {
    const sws = wb.addWorksheet("Summary");
    sws.addRow(["Metric", "Value"]);
    sws.addRow(["Contest", c.display_name || c.slug]);
    for (const [k, v] of Object.entries(summary)) {
      sws.addRow([k, v]);
    }
  }

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return xlsxResponse(buf, `${c.slug}_metrics.xlsx`);
}
