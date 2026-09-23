import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import type {
  Campus,
  Subject,
  TrackerContest,
  TrackerStudent,
} from "@/types/database";
import { addContest, addStudent, deleteStudent } from "./actions";

function formatTimestamp(value: string | null) {
  if (!value) return "never";
  const d = new Date(value);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getUTCDate()).padStart(2, "0")} ${String(
    d.getUTCHours()
  ).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} UTC`;
}

export default async function TrackerSubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ subjectId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { subjectId } = await params;
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: subject }, { data: contests }, { data: students }] =
    await Promise.all([
      supabase
        .from("subjects")
        .select("*, campuses(*)")
        .eq("id", subjectId)
        .single(),
      supabase
        .from("tracker_contests")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at"),
      supabase
        .from("tracker_students")
        .select("*")
        .eq("subject_id", subjectId)
        .order("hackerrank_username"),
    ]);

  if (!subject) notFound();
  const subjectRow = subject as Subject & { campuses: Campus | null };
  const campus = subjectRow.campuses;
  if (!campus) notFound();

  const params2 = await searchParams;
  const contestList = (contests ?? []) as TrackerContest[];
  const studentList = (students ?? []) as TrackerStudent[];
  const c = campus;
  const s = subjectRow;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-slate-500">
          <Link href="/tracker" className="text-brand-600">
            Tracker
          </Link>{" "}
          ›{" "}
          <Link
            href={`/tracker/campus/${c.id}`}
            className="text-brand-600"
          >
            {c.name}
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{s.name}</h1>

        {params2.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {params2.error}
          </p>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Contests</h2>
          {contestList.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Slug</th>
                    <th className="py-2 pr-4">Display name</th>
                    <th className="py-2 pr-4">Cutoff</th>
                    <th className="py-2 pr-4">Last fetched</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {contestList.map((contest) => (
                    <tr
                      key={contest.id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4 font-mono text-xs">
                        {contest.slug}
                      </td>
                      <td className="py-2 pr-4">{contest.display_name || ""}</td>
                      <td className="py-2 pr-4">
                        {contest.lecture_cutoff_challenge_count ?? "all"}
                      </td>
                      <td className="py-2 pr-4">
                        {formatTimestamp(contest.last_fetched_at)}
                      </td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/tracker/contest/${contest.id}`}
                          className="mr-3 text-brand-600"
                        >
                          View
                        </Link>
                        <Link
                          href={`/tracker/contest/${contest.id}/edit`}
                          className="text-brand-600"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No contests mapped yet.</p>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">
            Map a contest
          </h2>
          <form action={addContest} className="mt-4 space-y-3">
            <input type="hidden" name="subjectId" value={s.id} />
            <div>
              <label className="block text-sm font-medium text-slate-700">
                HackerRank contest slug *
              </label>
              <input
                type="text"
                name="slug"
                required
                placeholder="dsa-101-classwork"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Display name (optional)
              </label>
              <input
                type="text"
                name="display_name"
                placeholder="DSA 101 Classwork (Hi-Tech)"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Challenge cutoff (optional, e.g. &ldquo;as of lecture 5&rdquo;)
              </label>
              <input
                type="text"
                name="cutoff"
                placeholder="Leave blank for all challenges"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add contest
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Roster</h2>
          {studentList.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">HackerRank username</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {studentList.map((student) => (
                    <tr
                      key={student.id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4">{student.name || ""}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {student.hackerrank_username}
                      </td>
                      <td className="py-2 pr-4">
                        <form action={deleteStudent}>
                          <input
                            type="hidden"
                            name="subjectId"
                            value={s.id}
                          />
                          <input
                            type="hidden"
                            name="id"
                            value={student.id}
                          />
                          <ConfirmSubmitButton
                            confirmMessage={`Remove ${student.hackerrank_username} from this roster?`}
                            className="text-sm text-slate-400 hover:text-red-600"
                          >
                            Remove
                          </ConfirmSubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No students yet.</p>
          )}
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Add a student</h2>
          <form action={addStudent} className="mt-4 space-y-3">
            <input type="hidden" name="subjectId" value={s.id} />
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                placeholder="Aarav Sharma"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                HackerRank username *
              </label>
              <input
                type="text"
                name="hackerrank_username"
                required
                placeholder="aarav_s"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Add student
            </button>
          </form>
        </section>
      </main>
    </>
  );
}
