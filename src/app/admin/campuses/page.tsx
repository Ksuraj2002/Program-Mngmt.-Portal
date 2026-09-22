import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { addCampus, deleteCampus } from "./actions";

export default async function AdminCampusesPage() {
  const supabase = await createClient();

  const [{ profile }, { data: campuses }] = await Promise.all([
    requireAdmin(),
    supabase.from("campuses").select("*").order("name"),
  ]);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin" className="text-sm text-brand-600">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Campuses
        </h1>

        <form
          action={addCampus}
          className="mt-6 flex gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <input
            type="text"
            name="name"
            required
            placeholder="Campus name"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add campus
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {campuses?.map((campus) => (
            <div
              key={campus.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-slate-900">
                {campus.name}
              </span>
              <form action={deleteCampus}>
                <input type="hidden" name="id" value={campus.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${campus.name}"? This also deletes all of its subjects and entries.`}
                  className="text-sm text-slate-400 hover:text-red-600"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
          {!campuses?.length && (
            <p className="text-sm text-slate-500">No campuses yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
