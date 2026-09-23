import Link from "next/link";
import type { Profile } from "@/types/database";
import { signOut } from "@/app/auth/actions";

export function TopNav({ profile }: { profile: Profile }) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg font-semibold text-brand-700">
            Mirai School of Technology
          </span>
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-600 hover:text-brand-700">
            Campuses
          </Link>
          {profile.role === "admin" && (
            <>
              <Link
                href="/tracker"
                className="text-slate-600 hover:text-brand-700"
              >
                Tracker
              </Link>
              <Link
                href="/admin"
                className="text-slate-600 hover:text-brand-700"
              >
                Admin
              </Link>
            </>
          )}
          <span className="text-slate-400">
            {profile.full_name} · {profile.role}
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
