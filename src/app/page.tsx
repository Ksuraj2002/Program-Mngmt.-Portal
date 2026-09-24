import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ userId, profile }, { data: campuses }] = await Promise.all([
    requireProfile(),
    supabase.from("campuses").select("*").order("name"),
  ]);

  let pendingQuery = supabase
    .from("entries")
    .select(
      "id, subject_id, type, title, due_date, status, change_request, subjects!inner(id, name, campus_id, campuses!inner(id, name))"
    )
    .eq("status", "pending")
    .order("due_date", { ascending: true });

  if (profile.role !== "admin") {
    const { data: subjectRows } = await supabase
      .from("faculty_subjects")
      .select("subject_id")
      .eq("faculty_id", userId);
    const subjectIds = (subjectRows || []).map((r) => r.subject_id);
    if (subjectIds.length === 0) {
      pendingQuery = pendingQuery.in("subject_id", ["00000000-0000-0000-0000-000000000000"]);
    } else {
      pendingQuery = pendingQuery.in("subject_id", subjectIds);
    }
  }

  const { data: pendingEntries } = await pendingQuery;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Pending items
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {profile.role === "admin"
                  ? "Assignments and tests that still need work from you."
                  : "Assignments and tests still being prepared for your subjects."}
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {pendingEntries?.length || 0}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {(pendingEntries || []).map((entry) => {
              const subject = (entry as unknown as {
                subjects: {
                  id: string;
                  name: string;
                  campus_id: string;
                  campuses: { id: string; name: string };
                };
              }).subjects;
              return (
                <Link
                  key={entry.id}
                  href={`/campus/${subject.campus_id}/subject/${subject.id}`}
                  className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-brand-500 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        entry.type === "test"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-brand-100 text-brand-700"
                      }`}
                    >
                      {entry.type === "test" ? "Test" : "Assignment"}
                    </span>
                    {entry.change_request && (
                      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Changes requested
                      </span>
                    )}
                    <h3 className="text-base font-semibold text-slate-900">
                      {entry.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {subject.campuses.name} · {subject.name} · Due{" "}
                    {formatDate(entry.due_date)}
                  </p>
                </Link>
              );
            })}
            {!pendingEntries?.length && (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-6 text-sm text-slate-500">
                Nothing pending. All caught up!
              </p>
            )}
          </div>
        </section>

        <section className="mt-12">
          <h1 className="text-2xl font-semibold text-slate-900">Campuses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pick a campus to see its subjects, assignments, and tests.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {campuses?.map((campus) => (
              <Link
                key={campus.id}
                href={`/campus/${campus.id}`}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md"
              >
                <h2 className="text-lg font-medium text-slate-900">
                  {campus.name}
                </h2>
                <p className="mt-1 text-sm text-brand-600">View subjects →</p>
              </Link>
            ))}
            {!campuses?.length && (
              <p className="text-sm text-slate-500">
                No campuses yet.{" "}
                {profile.role === "admin" ? (
                  <Link href="/admin/campuses" className="text-brand-600">
                    Add one
                  </Link>
                ) : (
                  "Ask an admin to add one."
                )}
                .
              </p>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
