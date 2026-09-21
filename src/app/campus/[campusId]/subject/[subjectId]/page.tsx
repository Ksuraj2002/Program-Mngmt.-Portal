import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { MarkdownField } from "@/components/MarkdownField";
import { renderMarkdown } from "@/lib/markdown";
import { addEntry, deleteEntry } from "./actions";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type EntryTypeFilter = "all" | "assignment" | "test";

export default async function SubjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ campusId: string; subjectId: string }>;
  searchParams: Promise<{ error?: string; type?: string; add?: string }>;
}) {
  const { campusId, subjectId } = await params;
  const resolvedSearchParams = await searchParams;
  const activeType: EntryTypeFilter =
    resolvedSearchParams.type === "assignment" ||
    resolvedSearchParams.type === "test"
      ? resolvedSearchParams.type
      : "all";
  const showAddForm = resolvedSearchParams.add === "1";
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: campus }, { data: subject }] = await Promise.all([
    supabase.from("campuses").select("*").eq("id", campusId).single(),
    supabase.from("subjects").select("*").eq("id", subjectId).single(),
  ]);

  if (!campus || !subject || subject.campus_id !== campus.id) notFound();

  const [{ data: entries }, { data: mapping }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("entries")
        .select("*")
        .eq("subject_id", subject.id)
        .order("due_date", { ascending: true }),
      supabase
        .from("faculty_subjects")
        .select("faculty_id")
        .eq("subject_id", subject.id)
        .eq("faculty_id", userId)
        .maybeSingle(),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const canManage = profile.role === "admin" || Boolean(mapping);
  const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));
  const today = new Date().toISOString().slice(0, 10);
  const filteredEntries = (entries || []).filter(
    (entry) => activeType === "all" || entry.type === activeType
  );

  const filterHref = (type: EntryTypeFilter) =>
    type === "all" ? "?" : `?type=${type}`;
  const addFormHref = activeType === "all" ? "?add=1" : `?type=${activeType}&add=1`;
  const closeFormHref = activeType === "all" ? "?" : `?type=${activeType}`;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link
          href={`/campus/${campus.id}`}
          className="text-sm text-brand-600"
        >
          ← {campus.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {subject.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Assignments and tests for this subject.
        </p>

        {resolvedSearchParams.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {resolvedSearchParams.error}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
            {(
              [
                ["all", "All"],
                ["assignment", "Assignments"],
                ["test", "Tests"],
              ] as [EntryTypeFilter, string][]
            ).map(([type, label]) => (
              <Link
                key={type}
                href={filterHref(type)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  activeType === type
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {canManage && !showAddForm && (
            <Link
              href={addFormHref}
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              + Add assignment / test
            </Link>
          )}
        </div>

        {canManage && showAddForm && (
          <form
            action={addEntry}
            className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="campusId" value={campus.id} />
            <input type="hidden" name="subjectId" value={subject.id} />
            <input type="hidden" name="returnType" value={activeType} />

            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-medium text-slate-900">
                  Add assignment / test
                </h2>
                <p className="text-sm text-slate-500">
                  Fill in the details below.
                </p>
              </div>
              <Link
                href={closeFormHref}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Cancel
              </Link>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                required
                defaultValue={activeType === "test" ? "test" : "assignment"}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="assignment">Assignment</option>
                <option value="test">Test</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Unit 3 Problem Set"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Due date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="due_date"
                required
                defaultValue={today}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Details / instructions
              </label>
              <div className="mt-1">
                <MarkdownField
                  name="description"
                  placeholder="Topics covered, submission instructions, links, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Max marks (optional)
              </label>
              <input
                type="number"
                name="max_marks"
                min={0}
                step="0.5"
                placeholder="e.g. 100"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Submit
            </button>
          </form>
        )}

        <div className="mt-8 space-y-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      entry.type === "test"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-brand-100 text-brand-700"
                    }`}
                  >
                    {entry.type === "test" ? "Test" : "Assignment"}
                  </span>
                  <h3 className="mt-2 text-base font-semibold text-slate-900">
                    {entry.title}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Due {formatDate(entry.due_date)}
                    {entry.max_marks != null && ` · ${entry.max_marks} marks`}
                    {entry.created_by &&
                      ` · added by ${
                        nameById.get(entry.created_by) || "staff"
                      }`}
                  </p>
                  {entry.description && (
                    <div
                      className="prose prose-sm mt-2 max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdown(entry.description),
                      }}
                    />
                  )}
                </div>
                {canManage && (
                  <form action={deleteEntry}>
                    <input type="hidden" name="campusId" value={campus.id} />
                    <input
                      type="hidden"
                      name="subjectId"
                      value={subject.id}
                    />
                    <input type="hidden" name="entryId" value={entry.id} />
                    <button
                      type="submit"
                      className="text-sm text-slate-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
          {!filteredEntries.length && (
            <p className="text-sm text-slate-500">
              {activeType === "all"
                ? "No assignments or tests added yet."
                : `No ${activeType}s added yet.`}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
