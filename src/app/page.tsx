import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";

export default async function DashboardPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: campuses } = await supabase
    .from("campuses")
    .select("*")
    .order("name");

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-6 py-10">
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
      </main>
    </>
  );
}
