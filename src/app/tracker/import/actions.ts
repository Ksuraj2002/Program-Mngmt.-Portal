"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export type ImportRow = { username: string; name: string | null };
export type ImportSheet = {
  sheetName: string;
  subjectId: string;
  rows: ImportRow[];
};
export type ImportPayload = { sheets: ImportSheet[] };

export type ImportResult = {
  inserted: number;
  skipped: number;
  perSheet: {
    sheetName: string;
    subjectName: string;
    inserted: number;
    skipped: number;
    error?: string;
  }[];
};

export async function importStudentsAction(payloadJson: string) {
  await requireAdmin();
  const back = "/tracker/import";

  let payload: ImportPayload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    redirect(`${back}?error=${encodeURIComponent("Malformed payload.")}`);
  }
  if (!payload!.sheets?.length) {
    redirect(`${back}?error=${encodeURIComponent("No sheets to import.")}`);
  }

  const supabase = await createClient();
  const { data: subjects, error: subErr } = await supabase
    .from("subjects")
    .select("id, name, campus_id");
  if (subErr) {
    redirect(`${back}?error=${encodeURIComponent(subErr.message)}`);
  }
  const subjectById = new Map(
    (subjects ?? []).map((s) => [
      s.id,
      s as { id: string; name: string; campus_id: string },
    ])
  );

  const perSheet: ImportResult["perSheet"] = [];
  let totalInserted = 0;
  let totalSkipped = 0;

  for (const sheet of payload!.sheets) {
    const subject = subjectById.get(sheet.subjectId);
    if (!subject) {
      perSheet.push({
        sheetName: sheet.sheetName,
        subjectName: "(unknown)",
        inserted: 0,
        skipped: sheet.rows.length,
        error: "Subject not found.",
      });
      totalSkipped += sheet.rows.length;
      continue;
    }
    // Dedupe within the sheet by lowercase username.
    const seen = new Set<string>();
    const rows = sheet.rows
      .map((r) => ({
        username: (r.username || "").trim(),
        name: r.name?.trim() || null,
      }))
      .filter((r) => {
        if (!r.username) return false;
        const key = r.username.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((r) => ({
        campus_id: subject.campus_id,
        subject_id: subject.id,
        name: r.name,
        hackerrank_username: r.username,
      }));

    if (rows.length === 0) {
      perSheet.push({
        sheetName: sheet.sheetName,
        subjectName: subject.name,
        inserted: 0,
        skipped: 0,
      });
      continue;
    }

    // Filter out rows whose username already exists on this subject.
    // The unique index uses lower(hackerrank_username), so match on lowercase.
    const { data: existing, error: existErr } = await supabase
      .from("tracker_students")
      .select("hackerrank_username")
      .eq("subject_id", subject.id);
    if (existErr) {
      perSheet.push({
        sheetName: sheet.sheetName,
        subjectName: subject.name,
        inserted: 0,
        skipped: rows.length,
        error: existErr.message,
      });
      totalSkipped += rows.length;
      continue;
    }
    const existingLower = new Set(
      (existing ?? []).map((s: { hackerrank_username: string }) =>
        s.hackerrank_username.toLowerCase()
      )
    );
    const fresh = rows.filter(
      (r) => !existingLower.has(r.hackerrank_username.toLowerCase())
    );
    const preSkipped = rows.length - fresh.length;

    let inserted = 0;
    let error: string | undefined;
    const chunkSize = 500;
    for (let i = 0; i < fresh.length; i += chunkSize) {
      const chunk = fresh.slice(i, i + chunkSize);
      const { data, error: insErr } = await supabase
        .from("tracker_students")
        .insert(chunk)
        .select("id");
      if (insErr) {
        error = insErr.message;
        break;
      }
      inserted += data?.length ?? 0;
    }
    const skipped = preSkipped + (fresh.length - inserted);
    perSheet.push({
      sheetName: sheet.sheetName,
      subjectName: subject.name,
      inserted,
      skipped,
      error,
    });
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  const summary = encodeURIComponent(
    JSON.stringify({
      inserted: totalInserted,
      skipped: totalSkipped,
      perSheet,
    })
  );
  revalidatePath("/tracker");
  revalidatePath(back);
  redirect(`${back}?result=${summary}`);
}
