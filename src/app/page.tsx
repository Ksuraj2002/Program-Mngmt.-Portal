import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { PendingEntryCard } from "@/components/PendingEntryCard";
import {
  approveEntry,
  markEntryDone,
  requestEntryChanges,
} from "@/app/campus/[campusId]/subject/[subjectId]/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ userId, profile }, { data: campuses }] = await Promise.all([
    requireProfile(),
    supabase.from("campuses").select("*").order("name"),
  ]);

  const pendingStatuses: import("@/types/database").EntryStatus[] =
    profile.role === "admin" ? ["pending"] : ["pending", "done_by_tpm"];

  let pendingQuery = supabase
    .from("entries")
    .select(
      "id, subject_id, type, title, due_date, status, change_request, submission_link, subjects!inner(id, name, campus_id, campuses!inner(id, name))"
    )
    .in("status", pendingStatuses)
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
                  : "Assignments and tests being prepared or awaiting your review."}
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
                <PendingEntryCard
                  key={entry.id}
                  entry={{
                    id: entry.id,
                    type: entry.type,
                    title: entry.title,
                    due_date: entry.due_date,
                    status: entry.status,
                    change_request: entry.change_request,
                    submission_link: entry.submission_link,
                    subject: {
                      id: subject.id,
                      name: subject.name,
                      campus_id: subject.campus_id,
                      campus_name: subject.campuses.name,
                    },
                  }}
                  role={profile.role}
                  markEntryDone={markEntryDone}
                  approveEntry={approveEntry}
                  requestEntryChanges={requestEntryChanges}
                />
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
