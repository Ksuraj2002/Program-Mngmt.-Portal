import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import {
  TestCalendar,
  type CalendarTest,
  type ManageableSubject,
} from "@/components/TestCalendar";
import { addTestOnDate } from "./actions";

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
  searchParams: Promise<{ month?: string; error?: string }>;
}) {
  const { month, error } = await searchParams;
  const { year, month0 } = parseMonthParam(month);

  const supabase = await createClient();
  const { userId, profile } = await requireProfile();

  const mm = String(month0 + 1).padStart(2, "0");
  const firstIso = `${year}-${mm}-01`;
  const lastDay = new Date(year, month0 + 1, 0).getDate();
  const lastIso = `${year}-${mm}-${String(lastDay).padStart(2, "0")}`;
  const monthParam = `${year}-${mm}`;

  const [{ data: rows }, { data: allSubjects }, { data: mappings }] =
    await Promise.all([
      supabase
        .from("entries")
        .select(
          "id, title, test_date, subject_id, subjects!inner(id, name, campus_id, campuses!inner(id, name))"
        )
        .eq("type", "test")
        .not("test_date", "is", null)
        .gte("test_date", firstIso)
        .lte("test_date", lastIso)
        .order("test_date", { ascending: true }),
      supabase
        .from("subjects")
        .select("id, name, campus_id, campuses!inner(id, name)")
        .order("name"),
      profile.role === "admin"
        ? Promise.resolve({ data: null })
        : supabase
            .from("faculty_subjects")
            .select("subject_id")
            .eq("faculty_id", userId),
    ]);

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

  const subjectsRaw = (allSubjects || []) as unknown as Array<{
    id: string;
    name: string;
    campus_id: string;
    campuses: { id: string; name: string };
  }>;

  let manageable: ManageableSubject[] = [];
  if (profile.role === "admin") {
    manageable = subjectsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      campus_name: s.campuses.name,
    }));
  } else {
    const allowed = new Set((mappings || []).map((m) => m.subject_id));
    manageable = subjectsRaw
      .filter((s) => allowed.has(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        campus_name: s.campuses.name,
      }));
  }

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
              see what&apos;s on it or add a new test.
            </p>
          </div>
          <Link
            href="/calendar"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Today
          </Link>
        </div>

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <TestCalendar
          year={year}
          month0={month0}
          todayIso={todayIso}
          tests={tests}
          manageableSubjects={manageable}
          monthParam={monthParam}
          addTestOnDate={addTestOnDate}
        />
      </main>
    </>
  );
}
