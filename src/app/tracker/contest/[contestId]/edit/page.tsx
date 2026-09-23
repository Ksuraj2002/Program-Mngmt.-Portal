import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import type { Campus, Subject, TrackerContest } from "@/types/database";
import { updateContest } from "../actions";

export default async function EditContestPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { contestId } = await params;
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [contestResp, sp] = await Promise.all([
    supabase
      .from("tracker_contests")
      .select("*, subjects(*, campuses(*))")
      .eq("id", contestId)
      .single(),
    searchParams,
  ]);
  if (!contestResp.data) notFound();
  const contestRow = contestResp.data as TrackerContest & {
    subjects: (Subject & { campuses: Campus | null }) | null;
  };
  const c = contestRow;
  const s = contestRow.subjects;
  const cm = s?.campuses ?? null;

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-slate-500">
          <Link href="/tracker" className="text-brand-600">
            Tracker
          </Link>
          {cm && s && (
            <>
              {" "}
              ›{" "}
              <Link
                href={`/tracker/campus/${cm.id}`}
                className="text-brand-600"
              >
                {cm.name}
              </Link>{" "}
              ›{" "}
              <Link
                href={`/tracker/subject/${s.id}`}
                className="text-brand-600"
              >
                {s.name}
              </Link>
            </>
          )}
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Edit contest
        </h1>

        {sp.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {sp.error}
          </p>
        )}

        <form
          action={updateContest}
          className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="contestId" value={c.id} />
          <div>
            <label className="block text-sm font-medium text-slate-700">
              HackerRank contest slug
            </label>
            <input
              type="text"
              name="slug"
              required
              defaultValue={c.slug}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Display name
            </label>
            <input
              type="text"
              name="display_name"
              defaultValue={c.display_name ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Challenge cutoff (blank = all challenges)
            </label>
            <input
              type="text"
              name="cutoff"
              defaultValue={
                c.lecture_cutoff_challenge_count != null
                  ? String(c.lecture_cutoff_challenge_count)
                  : ""
              }
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save
          </button>
        </form>
      </main>
    </>
  );
}
