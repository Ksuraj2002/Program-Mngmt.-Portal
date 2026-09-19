import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

export default async function CampusPage({
  params,
}: {
  params: Promise<{ campusId: string }>;
}) {
  const { campusId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: campus } = await supabase
    .from("campuses")
    .select("*")
    .eq("id", campusId)
    .single();

  if (!campus) notFound();

  const { data: subjects } = await supabase
    .from("subjects")
    .select("*")
    .eq("campus_id", campus.id)
    .order("name");

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <Link href="/" className="text-sm text-brand-600">
          ← All campuses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {campus.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Subjects offered at this campus.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects?.map((subject) => (
            <Link
              key={subject.id}
              href={`/campus/${campus.id}/subject/${subject.id}`}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md"
            >
              <h2 className="text-lg font-medium text-slate-900">
                {subject.name}
              </h2>
              <p className="mt-1 text-sm text-brand-600">
                View assignments & tests →
              </p>
            </Link>
          ))}
          {!subjects?.length && (
            <p className="text-sm text-slate-500">
              No subjects mapped to this campus yet.{" "}
              {profile.role === "admin" ? (
                <Link href="/admin/subjects" className="text-brand-600">
                  Add one
                </Link>
              ) : (
                "Ask an admin to add one."
              )}
              .
            </p>
          )}
        </div>
      </main>
    </>
  );
}
