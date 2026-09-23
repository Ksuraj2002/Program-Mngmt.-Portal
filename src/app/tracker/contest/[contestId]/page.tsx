import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { loadContestMetrics } from "@/lib/tracker/queries";
import type {
  Campus,
  Subject,
  TrackerChallenge,
  TrackerContest,
} from "@/types/database";
import { fetchOneContest } from "./actions";

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

export default async function ContestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ contestId: string }>;
  searchParams: Promise<{ cutoff?: string; error?: string; flash?: string }>;
}) {
  const { contestId } = await params;
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const { data: contest } = await supabase
    .from("tracker_contests")
    .select("*")
    .eq("id", contestId)
    .single();
  if (!contest) notFound();
  const c = contest as TrackerContest;

  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", c.subject_id)
    .single();
  if (!subject) notFound();
  const s = subject as Subject;

  const { data: campus } = await supabase
    .from("campuses")
    .select("*")
    .eq("id", s.campus_id)
    .single();
  if (!campus) notFound();
  const cm = campus as Campus;

  const { data: challenges } = await supabase
    .from("tracker_challenges")
    .select("*")
    .eq("contest_id", contestId);
  const totalChallenges = ((challenges ?? []) as TrackerChallenge[]).length;

  const sp = await searchParams;
  let cutoffOverride: number | null | undefined = undefined;
  if (sp.cutoff !== undefined) {
    const raw = sp.cutoff.trim();
    cutoffOverride = raw === "" ? null : /^\d+$/.test(raw) ? Number(raw) : undefined;
  }

  const { rows, summary } = await loadContestMetrics(
    supabase,
    c,
    cutoffOverride
  );
  const effectiveCutoff =
    cutoffOverride === undefined
      ? c.lecture_cutoff_challenge_count
      : cutoffOverride;

  const exportQuery =
    effectiveCutoff != null ? `?cutoff=${effectiveCutoff}` : "";

  const summaryLabels: Record<keyof NonNullable<typeof summary>, string> = {
    participants: "Participants",
    avg_score: "Avg score",
    top_score: "Top score",
    min_score: "Min score",
    median_score: "Median score",
    avg_pct_completion: "Avg % completion",
  };

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-slate-500">
          <Link href="/tracker" className="text-brand-600">
            Tracker
          </Link>{" "}
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
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {c.display_name || c.slug}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Slug: <span className="font-mono">{c.slug}</span> · Last fetched:{" "}
          {formatTimestamp(c.last_fetched_at)} ·{" "}
          <Link
            href={`/tracker/contest/${c.id}/edit`}
            className="text-brand-600"
          >
            Edit settings
          </Link>
        </p>

        {sp.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {sp.error}
          </p>
        )}
        {sp.flash && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {sp.flash}
          </p>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Fetch now</h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste your HackerRank session cookie below. It&apos;s used only for
            this one fetch and is never saved.
          </p>
          <form action={fetchOneContest} className="mt-3 flex flex-wrap gap-2">
            <input type="hidden" name="contestId" value={c.id} />
            <input
              type="password"
              name="cookie"
              required
              placeholder="paste the full Cookie header value"
              className="min-w-[260px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <button
              type="submit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Fetch now
            </button>
          </form>
        </section>

        {c.last_fetched_at ? (
          <>
            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-medium text-slate-900">
                Challenge cutoff (&ldquo;as of lecture N&rdquo;)
              </h2>
              <form method="get" className="mt-3 flex flex-wrap gap-2">
                <input
                  type="text"
                  name="cutoff"
                  defaultValue={
                    effectiveCutoff != null ? String(effectiveCutoff) : ""
                  }
                  placeholder={`Only count the first N challenges (blank = all ${totalChallenges})`}
                  className="min-w-[260px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Apply
                </button>
              </form>
              {effectiveCutoff != null && (
                <p className="mt-3 text-xs text-slate-500">
                  Cutoff active: first {effectiveCutoff} challenges.{" "}
                  <strong>Approximate by design</strong> — HackerRank
                  doesn&apos;t expose per-challenge score breakdowns for
                  developer-account contests, so scores are still each
                  student&apos;s whole-contest total; only the max-score
                  denominator is capped. % completion can exceed 100% for
                  students who worked ahead of the cutoff.
                </p>
              )}
            </section>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`/tracker/export/contest-csv/${c.id}${exportQuery}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Export CSV
              </a>
              <a
                href={`/tracker/export/contest-xlsx/${c.id}${exportQuery}`}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Export Excel
              </a>
            </div>

            {summary && (
              <section className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:grid-cols-3 lg:grid-cols-6">
                {(
                  Object.keys(summaryLabels) as (keyof typeof summaryLabels)[]
                ).map((k) => (
                  <div key={k}>
                    <div className="text-xs uppercase tracking-wide text-slate-500">
                      {summaryLabels[k]}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">
                      {k === "avg_pct_completion"
                        ? `${summary[k]}%`
                        : summary[k]}
                    </div>
                  </div>
                ))}
              </section>
            )}

            <section className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Rank</th>
                    <th className="py-2 pr-4">Username</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Max</th>
                    <th className="py-2 pr-4">% Completion</th>
                    <th className="py-2 pr-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="py-2 pr-4">{r.rank}</td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.hacker}
                      </td>
                      <td className="py-2 pr-4">{r.score}</td>
                      <td className="py-2 pr-4">{r.max_score}</td>
                      <td className="py-2 pr-4">
                        {(r.pct_completion * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs">
                        {r.time_hms}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <p className="mt-6 text-sm text-slate-500">Never fetched yet.</p>
        )}
      </main>
    </>
  );
}
