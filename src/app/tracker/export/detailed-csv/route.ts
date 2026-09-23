import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, loadDetailedRows, toCsv } from "@/lib/tracker/exports";

export async function GET() {
  await requireAdmin();
  const supabase = await createClient();
  const rows = await loadDetailedRows(supabase);
  if (!rows.length) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        "Nothing to export yet — fetch some contests first."
      )}`
    );
  }
  const out: unknown[][] = [
    [
      "Campus",
      "Subject",
      "Contest",
      "Account",
      "Rank",
      "Username",
      "Score",
      "Max",
      "% Completion",
      "Time (H:M:S)",
    ],
  ];
  for (const r of rows) {
    out.push([
      r.campus,
      r.subject,
      r.contest,
      r.account,
      r.rank,
      r.username,
      r.score,
      r.max_score,
      `${(r.pct_completion * 100).toFixed(1)}%`,
      r.time_hms,
    ]);
  }
  return csvResponse(toCsv(out), "dashboard_detailed.csv");
}
