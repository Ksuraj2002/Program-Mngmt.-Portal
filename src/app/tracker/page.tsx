import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { loadTrackerAggregatesFast } from "@/lib/tracker/queries";
import { bulkFetchAccount } from "./actions";

export default async function TrackerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; flash?: string }>;
}) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [{ campusAggregatesFast, subjectAggregatesFast, accountCounts }, params] =
    await Promise.all([loadTrackerAggregatesFast(supabase), searchParams]);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              HackerRank tracker
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Per-campus and per-subject leaderboard rollups. Campuses and
              subjects are managed under{" "}
              <Link href="/admin/campuses" className="text-brand-600">
                Admin
              </Link>
              .
            </p>
          </div>
          <Link
            href="/tracker/rollup"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            Full rollup →
          </Link>
        </div>

        {params.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {params.error}
          </p>
        )}
        {params.flash && (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {params.flash}
          </p>
        )}

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Campuses</h2>
          {campusAggregatesFast.length ? (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Campus</th>
                    <th className="py-2 pr-4">Subjects</th>
                    <th className="py-2 pr-4">Students</th>
                    <th className="py-2 pr-4">Avg % completion</th>
                    <th className="py-2 pr-4">Avg score</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {campusAggregatesFast.map((row) => (
                    <tr
                      key={row.campus.id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {row.campus.name}
                      </td>
                      <td className="py-2 pr-4">{row.subjectsCount}</td>
                      <td className="py-2 pr-4">{row.studentCount}</td>
                      <td className="py-2 pr-4 font-semibold">
                        {row.avg_pct_completion}%
                      </td>
                      <td className="py-2 pr-4">{row.avg_score}</td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/tracker/campus/${row.campus.id}`}
                          className="text-brand-600"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">
              No campuses yet.{" "}
              <Link href="/admin/campuses" className="text-brand-600">
                Add one
              </Link>
              .
            </p>
          )}
        </section>

        {campusAggregatesFast.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">Export</h2>
            <p className="mt-1 text-sm text-slate-500">
              Download the summary tables shown here or a detailed per-student
              row dump.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href="/tracker/export/homepage-xlsx"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Summary XLSX
              </a>
              <a
                href="/tracker/export/homepage-csv"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                By-subject CSV
              </a>
              <a
                href="/tracker/export/detailed-xlsx"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Detailed XLSX
              </a>
              <a
                href="/tracker/export/detailed-csv"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Detailed CSV
              </a>
            </div>
          </section>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">
            Refresh by HackerRank account
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste each account&apos;s cookie once to refresh every contest
            linked to it. The cookie is used for this request only — never
            saved.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {accountCounts.map((a) => (
              <form
                key={a.account}
                action={bulkFetchAccount}
                className="rounded-lg border border-slate-200 p-4"
              >
                <input type="hidden" name="account" value={a.account} />
                <div className="mb-2 text-sm">
                  <strong>{a.account} account</strong> — {a.contestCount}{" "}
                  contest{a.contestCount === 1 ? "" : "s"}
                </div>
                <textarea
                  name="cookie"
                  rows={2}
                  required
                  disabled={a.contestCount === 0}
                  placeholder={`Paste HackerRank cookie for the ${a.account} account`}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:bg-slate-50"
                />
                <button
                  type="submit"
                  disabled={a.contestCount === 0}
                  className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-slate-300"
                >
                  Refresh all {a.account} contests
                </button>
              </form>
            ))}
          </div>
        </section>

        {subjectAggregatesFast.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-medium text-slate-900">By subject</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2 pr-4">Campus</th>
                    <th className="py-2 pr-4">Subject</th>
                    <th className="py-2 pr-4">Enrolled</th>
                    <th className="py-2 pr-4">Contest entries</th>
                    <th className="py-2 pr-4">Avg % completion</th>
                    <th className="py-2 pr-4">Avg score</th>
                    <th className="py-2 pr-4" />
                  </tr>
                </thead>
                <tbody>
                  {subjectAggregatesFast.map(({ row, campus }) => (
                    <tr
                      key={row.subject_id}
                      className="border-t border-slate-100"
                    >
                      <td className="py-2 pr-4">{campus.name}</td>
                      <td className="py-2 pr-4 font-medium text-slate-900">
                        {row.subject_name}
                      </td>
                      <td className="py-2 pr-4">{row.student_count}</td>
                      <td className="py-2 pr-4">{row.participants}</td>
                      <td className="py-2 pr-4 font-semibold">
                        {row.avg_pct_completion}%
                      </td>
                      <td className="py-2 pr-4">{row.avg_score}</td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/tracker/subject/${row.subject_id}`}
                          className="text-brand-600"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
