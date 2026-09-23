import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTrackerAggregates, summarizeStat } from "@/lib/tracker/queries";
import { xlsxResponse } from "@/lib/tracker/exports";

export async function GET() {
  await requireAdmin();
  const supabase = await createClient();
  const { campusAggregates, subjectAggregates } =
    await loadTrackerAggregates(supabase);

  const wb = new ExcelJS.Workbook();
  const cws = wb.addWorksheet("Campuses");
  cws.addRow([
    "Campus",
    "Subjects",
    "Enrolled",
    "Participants",
    "Avg % completion",
    "Avg score",
    "Top",
    "Min",
    "Median",
  ]);
  for (const r of campusAggregates) {
    const s = summarizeStat(r.stat);
    cws.addRow([
      r.campus.name,
      r.subjectsCount,
      r.studentCount,
      s.participants,
      s.avg_pct_completion / 100,
      s.avg_score,
      s.top_score,
      s.min_score,
      s.median_score,
    ]);
  }
  cws.getColumn(5).numFmt = "0.0%";

  const sws = wb.addWorksheet("By Subject");
  sws.addRow([
    "Campus",
    "Subject",
    "Enrolled",
    "Participants",
    "Avg % completion",
    "Avg score",
    "Top",
    "Min",
    "Median",
  ]);
  for (const r of subjectAggregates) {
    const s = summarizeStat(r.stat);
    sws.addRow([
      r.campus.name,
      r.subject.name,
      r.studentCount,
      s.participants,
      s.avg_pct_completion / 100,
      s.avg_score,
      s.top_score,
      s.min_score,
      s.median_score,
    ]);
  }
  sws.getColumn(5).numFmt = "0.0%";

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return xlsxResponse(buf, "dashboard_summary.xlsx");
}
