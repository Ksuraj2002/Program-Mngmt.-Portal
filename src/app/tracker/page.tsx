import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { loadTrackerAggregatesFast } from "@/lib/tracker/queries";
import { listCredentialStatus } from "@/lib/tracker/credentials";
import { refreshAccountNowAction, saveHrCookieAction } from "./actions";

export default async function TrackerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; flash?: string }>;
}) {
  const { profile } = await requireAdmin();
  const supabase = await createClient();
  const [
    { campusAggregatesFast, subjectAggregatesFast, accountCounts },
    credentialStatuses,
    params,
  ] = await Promise.all([
    loadTrackerAggregatesFast(supabase),
    listCredentialStatus(),
    searchParams,
  ]);
  const credentialByAccount = new Map(
    credentialStatuses.map((c) => [c.account, c] as const)
  );

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
            HackerRank cookies (auto-refresh)
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Paste each account&apos;s <code>_hrank_session</code> cookie once —
            it&apos;s encrypted and stored, then a daily cron uses it to refresh
            every contest. When HackerRank invalidates a cookie, the status
            flips to <em>expired</em> and a banner appears on the homepage;
            paste a fresh one to resume.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {accountCounts.map((a) => {
              const cred = credentialByAccount.get(a.account);
              const hasCookie = !!cred && cred.updated_at !== "";
              const isExpired = cred?.status === "expired";
              return (
                <div
                  key={a.account}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>
                      <strong>{a.account} account</strong> — {a.contestCount}{" "}
                      contest{a.contestCount === 1 ? "" : "s"}
                    </span>
                    <span
                      className={
                        !hasCookie
                          ? "rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          : isExpired
                          ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                          : "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                      }
                    >
                      {!hasCookie
                        ? "no cookie"
                        : isExpired
                        ? "expired"
                        : "active"}
                    </span>
                  </div>
                  <p className="mb-2 text-xs text-slate-500">
                    {cred?.last_refresh_ok_at
                      ? `Last successful refresh: ${new Date(
                          cred.last_refresh_ok_at
                        ).toLocaleString()}`
                      : "No successful auto-refresh yet."}
                    {cred?.last_refresh_error && (
                      <>
                        {" · "}
                        <span className="text-red-700">
                          {cred.last_refresh_error.length > 120
                            ? cred.last_refresh_error.slice(0, 120) + "…"
                            : cred.last_refresh_error}
                        </span>
                      </>
                    )}
                  </p>
                  <form action={saveHrCookieAction}>
                    <input type="hidden" name="account" value={a.account} />
                    <textarea
                      name="cookie"
                      rows={2}
                      required
                      placeholder={
                        hasCookie
                          ? `Paste a fresh cookie for ${a.account} to replace the stored one`
                          : `Paste HackerRank cookie for the ${a.account} account`
                      }
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    <button
                      type="submit"
                      className="mt-2 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                    >
                      Save cookie
                    </button>
                  </form>
                  {hasCookie && a.contestCount > 0 && (
                    <form
                      action={refreshAccountNowAction}
                      className="mt-2"
                    >
                      <input type="hidden" name="account" value={a.account} />
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Refresh now using stored cookie
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
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
