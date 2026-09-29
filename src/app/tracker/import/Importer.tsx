"use client";

import { useMemo, useState, useTransition } from "react";
import ExcelJS from "exceljs";
import { importStudentsAction, type ImportPayload } from "./actions";

type SubjectOption = {
  id: string;
  name: string;
  campus_id: string;
  campusName: string;
};

type ParsedRow = { username: string; name: string | null };
type ParsedSheet = { sheetName: string; rows: ParsedRow[]; subjectId: string };

function guessSubject(sheetName: string, options: SubjectOption[]) {
  const s = sheetName.toLowerCase();
  // Score each option by shared token count with sheet name.
  const tokens = s.split(/[^a-z0-9]+/).filter(Boolean);
  let best: { opt: SubjectOption; score: number } | null = null;
  for (const opt of options) {
    const hay = `${opt.campusName} ${opt.name}`.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += t.length;
    }
    if (!best || score > best.score) best = { opt, score };
  }
  return best && best.score > 0 ? best.opt.id : options[0]?.id ?? "";
}

export function Importer({ subjects }: { subjects: SubjectOption[] }) {
  const [sheets, setSheets] = useState<ParsedSheet[] | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const totalRows = useMemo(
    () => (sheets ?? []).reduce((acc, s) => acc + s.rows.length, 0),
    [sheets]
  );

  async function handleFile(f: File) {
    setParseError(null);
    setFileName(f.name);
    try {
      const buf = await f.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const parsed: ParsedSheet[] = [];
      wb.eachSheet((ws) => {
        const rows: ParsedRow[] = [];
        // First row is header. Find columns.
        const header = ws.getRow(1);
        const headerVals: string[] = [];
        header.eachCell({ includeEmpty: true }, (cell, col) => {
          headerVals[col] = String(cell.value ?? "").trim().toLowerCase();
        });
        const usernameCol = headerVals.findIndex((h) =>
          h?.includes("username") || h?.includes("hackerrank")
        );
        const nameCol = headerVals.findIndex(
          (h) => h === "name" || h?.includes("student name")
        );
        const uCol = usernameCol >= 0 ? usernameCol : 1;
        const nCol = nameCol >= 0 ? nameCol : 2;
        for (let r = 2; r <= ws.rowCount; r++) {
          const row = ws.getRow(r);
          const u = String(row.getCell(uCol).value ?? "").trim();
          const n = String(row.getCell(nCol).value ?? "").trim();
          if (!u) continue;
          rows.push({ username: u, name: n || null });
        }
        parsed.push({
          sheetName: ws.name,
          rows,
          subjectId: guessSubject(ws.name, subjects),
        });
      });
      setSheets(parsed);
    } catch (e) {
      setParseError((e as Error).message);
      setSheets(null);
    }
  }

  function submit() {
    if (!sheets) return;
    const payload: ImportPayload = {
      sheets: sheets
        .filter((s) => s.subjectId && s.rows.length > 0)
        .map((s) => ({
          sheetName: s.sheetName,
          subjectId: s.subjectId,
          rows: s.rows,
        })),
    };
    startTransition(() => {
      void importStudentsAction(JSON.stringify(payload));
    });
  }

  return (
    <div>
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6">
        <label className="block text-sm font-medium text-slate-700">
          Choose an .xlsx file
        </label>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          className="mt-2 block w-full text-sm"
        />
        {fileName && (
          <p className="mt-2 text-xs text-slate-500">
            Loaded <strong>{fileName}</strong> — {sheets?.length ?? 0} sheet
            {sheets?.length === 1 ? "" : "s"}, {totalRows} row
            {totalRows === 1 ? "" : "s"} total.
          </p>
        )}
        {parseError && (
          <p className="mt-2 text-sm text-red-700">Parse error: {parseError}</p>
        )}
      </div>

      {sheets && sheets.length > 0 && (
        <>
          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-500">
                  <th className="px-3 py-2">Sheet</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">Assign to subject</th>
                  <th className="px-3 py-2">Preview</th>
                </tr>
              </thead>
              <tbody>
                {sheets.map((s, i) => (
                  <tr key={s.sheetName} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {s.sheetName}
                    </td>
                    <td className="px-3 py-2">{s.rows.length}</td>
                    <td className="px-3 py-2">
                      <select
                        value={s.subjectId}
                        onChange={(e) => {
                          const next = [...sheets];
                          next[i] = { ...s, subjectId: e.target.value };
                          setSheets(next);
                        }}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">— skip —</option>
                        {subjects.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.campusName} · {opt.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {s.rows.slice(0, 3).map((r) => r.username).join(", ")}
                      {s.rows.length > 3 ? ", …" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={submit}
            className="mt-4 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-brand-400 disabled:cursor-wait"
          >
            {pending
              ? "Importing…"
              : `Import ${totalRows} row${totalRows === 1 ? "" : "s"}`}
          </button>
          <p className="mt-2 text-xs text-slate-500">
            Rows whose HackerRank username already exists on a subject&apos;s
            roster are skipped, so this is safe to rerun.
          </p>
        </>
      )}
    </div>
  );
}
