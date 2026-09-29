import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { Importer } from "./Importer";

type Params = { error?: string; result?: string };

type PerSheet = {
  sheetName: string;
  subjectName: string;
  inserted: number;
  skipped: number;
  error?: string;
};

type Summary = {
  inserted: number;
  skipped: number;
  perSheet: PerSheet[];
};

export default async function ImportStudentsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [{ data: campuses }, { data: subjects }, params] = await Promise.all([
    supabase.from("campuses").select("id, name").order("name"),
    supabase.from("subjects").select("id, name, campus_id").order("name"),
    searchParams,
  ]);
  const campusById = new Map(
    (campuses ?? []).map((c) => [c.id, c as { id: string; name: string }])
  );
  const subjectOptions = (subjects ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    campus_id: s.campus_id as string,
    campusName: campusById.get(s.campus_id as string)?.name ?? "(unknown)",
  }));

  let summary: Summary | null = null;
  if (params.result) {
    try {
      summary = JSON.parse(params.result) as Summary;
    } catch {
      summary = null;
    }
  }

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Import students
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload an Excel (.xlsx) file. Each sheet becomes a subject roster —
              we pre-guess the mapping from the sheet name; adjust as needed.
            </p>
          </div>
          <Link href="/tracker" className="text-sm text-brand-600">
            ← Tracker
          </Link>
        </div>

        {params.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}

        {summary && (
          <section className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-800">
              Imported {summary.inserted} · skipped {summary.skipped}
            </p>
            <ul className="mt-2 space-y-1 text-emerald-900">
              {summary.perSheet.map((p) => (
                <li key={p.sheetName}>
                  <strong>{p.sheetName}</strong> → {p.subjectName}:{" "}
                  {p.inserted} inserted, {p.skipped} skipped
                  {p.error && (
                    <span className="text-red-700"> — {p.error}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {subjectOptions.length === 0 ? (
          <p className="mt-6 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No subjects exist yet. Add some under{" "}
            <Link href="/admin/subjects" className="text-brand-600">
              Admin → Subjects
            </Link>{" "}
            first, then come back to import students.
          </p>
        ) : (
          <div className="mt-6">
            <Importer subjects={subjectOptions} />
          </div>
        )}
      </main>
    </>
  );
}
