import { signIn } from "@/app/auth/actions";
import { PendingButton } from "@/components/PendingButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirectTo?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-brand-700">
          Mirai School of Technology
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Staff portal — sign in to continue
        </p>

        {resolvedSearchParams.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {resolvedSearchParams.error}
          </p>
        )}

        <form action={signIn} className="mt-6 space-y-4">
          <input
            type="hidden"
            name="redirectTo"
            value={resolvedSearchParams.redirectTo || "/"}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <PendingButton
            pendingLabel="Signing in…"
            className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:bg-brand-700/70"
          >
            Sign in
          </PendingButton>
        </form>

        <p className="mt-6 text-xs text-slate-400">
          Don&apos;t have an account? Ask your admin to add you from the
          Admin → Faculty panel.
        </p>
      </div>
    </main>
  );
}
