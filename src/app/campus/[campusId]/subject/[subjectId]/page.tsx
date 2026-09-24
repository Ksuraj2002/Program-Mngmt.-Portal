import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { AddEntryForm } from "@/components/AddEntryForm";
import { EntryList } from "@/components/EntryList";
import { renderMarkdown } from "@/lib/markdown";
import {
  addEntry,
  deleteEntry,
  markEntryDone,
  approveEntry,
  requestEntryChanges,
} from "./actions";

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
  const supabase = await createClient();

  const [
    { userId, profile },
    { data: campus },
    { data: subject },
    { data: profiles },
  ] = await Promise.all([
    requireProfile(),
    supabase.from("campuses").select("*").eq("id", campusId).single(),
    supabase.from("subjects").select("*").eq("id", subjectId).single(),
    supabase.from("profiles").select("id, full_name"),
  ]);

  if (!campus || !subject || subject.campus_id !== campus.id) notFound();

  const [{ data: entries }, { data: mapping }] = await Promise.all([
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
  ]);

  const canManage = profile.role === "admin" || Boolean(mapping);
  const nameById = new Map((profiles || []).map((p) => [p.id, p.full_name]));
  const today = new Date().toISOString().slice(0, 10);

  const entryViews = (entries || []).map((entry) => ({
    ...entry,
    createdByName: entry.created_by
      ? nameById.get(entry.created_by) || "staff"
      : null,
    descriptionHtml: renderMarkdown(entry.description),
  }));

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

        {canManage && showAddForm && (
          <AddEntryForm
            campusId={campus.id}
            subjectId={subject.id}
            activeType={activeType}
            today={today}
            closeHref={closeFormHref}
            addEntry={addEntry}
          />
        )}

        <EntryList
          entries={entryViews}
          canManage={canManage}
          role={profile.role}
          campusId={campus.id}
          subjectId={subject.id}
          initialType={activeType}
          showAddButton={!showAddForm}
          addFormHref={addFormHref}
          deleteEntry={deleteEntry}
          markEntryDone={markEntryDone}
          approveEntry={approveEntry}
          requestEntryChanges={requestEntryChanges}
        />
      </main>
    </>
  );
}
