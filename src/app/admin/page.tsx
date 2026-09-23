import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function AdminHomePage() {
  const { profile } = await requireAdmin();

  const links = [
    {
      href: "/admin/campuses",
      title: "Campuses",
      description: "Add, rename, or remove campuses.",
    },
    {
      href: "/admin/subjects",
      title: "Subjects",
      description: "Map subjects to a campus.",
    },
    {
      href: "/admin/faculty",
      title: "Faculty",
      description:
        "Create faculty accounts and assign them to the subjects they teach.",
    },
    {
      href: "/tracker",
      title: "HackerRank tracker",
      description:
        "Map HackerRank contests to subjects, roster students, and view leaderboard rollups.",
    },
  ];

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Program management settings.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-500 hover:shadow-md"
            >
              <h2 className="text-lg font-medium text-slate-900">
                {link.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
