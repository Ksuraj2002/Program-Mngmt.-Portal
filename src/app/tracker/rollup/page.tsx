import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { loadTrackerAggregates, summarizeStat } from "@/lib/tracker/queries";

export default async function RollupPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const { subjectAggregates } = await loadTrackerAggregates(supabase);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Link href="/tracker" className="text-sm text-brand-600">
          ← Tracker
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">Rollup</h1>
        <p className="mt-1 text-sm text-slate-500">
          Computed fresh from the database on every load. &ldquo;Contest
          entries&rdquo; counts every leaderboard row across this subject&apos;s
          fetched contests — it isn&apos;t filtered to roster-matched students
          yet.
        </p>

        <section className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="py-2 pr-4">Campus</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Enrolled</th>
                <th className="py-2 pr-4">Contest entries</th>
                <th className="py-2 pr-4">Avg % completion</th>
                <th className="py-2 pr-4">Avg score</th>
                <th className="py-2 pr-4">Top score</th>
                <th className="py-2 pr-4">Min score</th>
                <th className="py-2 pr-4">Median score</th>
              </tr>
            </thead>
            <tbody>
              {subjectAggregates.map((row) => {
                const s = summarizeStat(row.stat);
                return (
                  <tr
                    key={row.subject.id}
                    className="border-t border-slate-100"
                  >
                    <td className="py-2 pr-4">{row.campus.name}</td>
                    <td className="py-2 pr-4 font-medium text-slate-900">
                      {row.subject.name}
                    </td>
                    <td className="py-2 pr-4">{row.studentCount}</td>
                    <td className="py-2 pr-4">{s.participants}</td>
                    <td className="py-2 pr-4 font-semibold">
                      {s.avg_pct_completion}%
                    </td>
                    <td className="py-2 pr-4">{s.avg_score}</td>
                    <td className="py-2 pr-4">{s.top_score}</td>
                    <td className="py-2 pr-4">{s.min_score}</td>
                    <td className="py-2 pr-4">{s.median_score}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </main>
    </>
  );
}
