import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { TestCalendar, type CalendarTest } from "@/components/TestCalendar";

function parseMonthParam(raw: string | undefined): { year: number; month0: number } {
  const now = new Date();
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map((n) => Number(n));
    if (y >= 1970 && m >= 1 && m <= 12) return { year: y, month0: m - 1 };
  }
  return { year: now.getFullYear(), month0: now.getMonth() };
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { year, month0 } = parseMonthParam(month);

  const supabase = await createClient();
  const { profile } = await requireProfile();

  const mm = String(month0 + 1).padStart(2, "0");
  const firstIso = `${year}-${mm}-01`;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const lastIso = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;

  const { data: rows } = await supabase
    .from("entries")
    .select(
      "id, title, test_date, subject_id, subjects!inner(id, name, campus_id, campuses!inner(id, name))"
    )
    .eq("type", "test")
    .not("test_date", "is", null)
    .gte("test_date", firstIso)
    .lte("test_date", lastIso)
    .order("test_date", { ascending: true });

  const tests: CalendarTest[] = ((rows || []) as unknown as Array<{
    id: string;
    title: string;
    test_date: string;
    subject_id: string;
    subjects: {
      id: string;
      name: string;
      campus_id: string;
      campuses: { id: string; name: string };
    };
  }>).map((r) => ({
    id: r.id,
    title: r.title,
    test_date: r.test_date,
    subject_id: r.subject_id,
    subject_name: r.subjects.name,
    campus_id: r.subjects.campus_id,
    campus_name: r.subjects.campuses.name,
  }));

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Test calendar
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              All scheduled tests across campuses and subjects. Click a day to
              see what&apos;s on it.
            </p>
          </div>
          <Link
            href="/calendar"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Today
          </Link>
        </div>

        <TestCalendar
          year={year}
          month0={month0}
          todayIso={todayIso}
          tests={tests}
        />

        <p className="mt-6 text-xs text-slate-500">
          Tests are scheduled from each subject&apos;s page — open a subject and
          add a test entry with a test date to see it here.
        </p>
      </main>
    </>
  );
}
