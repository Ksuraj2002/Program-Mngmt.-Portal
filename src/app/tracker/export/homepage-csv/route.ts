import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTrackerAggregates, summarizeStat } from "@/lib/tracker/queries";
import { csvResponse, toCsv } from "@/lib/tracker/exports";

export async function GET() {
  await requireAdmin();
  const supabase = await createClient();
  const { subjectAggregates } = await loadTrackerAggregates(supabase);

  const rows: unknown[][] = [
    [
      "Campus",
      "Subject",
      "Enrolled",
      "Participants",
      "Avg % completion",
      "Avg score",
      "Top",
      "Min",
      "Median",
    ],
  ];
  for (const r of subjectAggregates) {
    const s = summarizeStat(r.stat);
    rows.push([
      r.campus.name,
      r.subject.name,
      r.studentCount,
      s.participants,
      `${s.avg_pct_completion}%`,
      s.avg_score,
      s.top_score,
      s.min_score,
      s.median_score,
    ]);
  }
  return csvResponse(toCsv(rows), "dashboard_by_subject.csv");
}
