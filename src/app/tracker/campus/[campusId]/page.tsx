import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import type {
  Subject,
  TrackerContest,
  TrackerStudent,
} from "@/types/database";

export default async function TrackerCampusPage({
  params,
}: {
  params: Promise<{ campusId: string }>;
}) {
  const { campusId } = await params;
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: campus }, { data: subjects }, { data: contests }, { data: students }] =
    await Promise.all([
      supabase.from("campuses").select("*").eq("id", campusId).single(),
      supabase
        .from("subjects")
        .select("*")
        .eq("campus_id", campusId)
        .order("name"),
      supabase.from("tracker_contests").select("*"),
      supabase.from("tracker_students").select("*").eq("campus_id", campusId),
    ]);

  if (!campus) notFound();

  const subjectList = (subjects ?? []) as Subject[];
  const contestList = (contests ?? []) as TrackerContest[];
  const studentList = (students ?? []) as TrackerStudent[];

  const contestsBySubject = new Map<string, TrackerContest[]>();
  for (const c of contestList) {
    const list = contestsBySubject.get(c.subject_id) ?? [];
    list.push(c);
    contestsBySubject.set(c.subject_id, list);
  }
  const studentsBySubject = new Map<string, number>();
  for (const s of studentList) {
    studentsBySubject.set(s.subject_id, (studentsBySubject.get(s.subject_id) ?? 0) + 1);
  }

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link href="/tracker" className="text-sm text-brand-600">
          ← Tracker
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {campus.name}
        </h1>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Subjects</h2>
          {subjectList.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Contests</th>
                    <th className="py-2 pr-4">Students</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {subjectList.map((subj) => (
                    <tr
                      key={subj.id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {subj.name}
                      </td>
                      <td className="py-2 pr-4">
                        {(contestsBySubject.get(subj.id) ?? []).length}
                      </td>
                      <td className="py-2 pr-4">
                        {studentsBySubject.get(subj.id) ?? 0}
                      </td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/tracker/subject/${subj.id}`}
                          className="text-brand-600"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No subjects mapped to this campus yet.{" "}
              <Link href="/admin/subjects" className="text-brand-600">
                Add one
              </Link>
              .
            </p>
          )}
        </section>
      </main>
    </>
  );
}
