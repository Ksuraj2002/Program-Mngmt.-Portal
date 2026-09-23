import ExcelJS from "exceljs";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadDetailedRows, xlsxResponse } from "@/lib/tracker/exports";

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
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Detailed");
  ws.addRow([
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
  ]);
  for (const r of rows) {
    ws.addRow([
      r.campus,
      r.subject,
      r.contest,
      r.account,
      r.rank,
      r.username,
      r.score,
      r.max_score,
      r.pct_completion,
      r.time_hms,
    ]);
  }
  ws.getColumn(9).numFmt = "0.0%";
  ws.views = [{ state: "frozen", ySplit: 1 }];

  const buf = Buffer.from(await wb.xlsx.writeBuffer());
  return xlsxResponse(buf, "dashboard_detailed.xlsx");
}
