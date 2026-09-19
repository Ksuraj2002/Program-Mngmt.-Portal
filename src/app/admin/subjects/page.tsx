import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { addSubject, deleteSubject } from "./actions";

export default async function AdminSubjectsPage() {
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: campuses }, { data: subjects }] = await Promise.all([
    supabase.from("campuses").select("*").order("name"),
    supabase.from("subjects").select("*, campuses(name)").order("name"),
  ]);

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin" className="text-sm text-brand-600">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Subjects
        </h1>

        <form
          action={addSubject}
          className="mt-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <select
            name="campus_id"
            required
            defaultValue=""
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="" disabled>
              Select campus
            </option>
            {campuses?.map((campus) => (
              <option key={campus.id} value={campus.id}>
                {campus.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="name"
            required
            placeholder="Subject name"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Add subject
          </button>
        </form>

        <div className="mt-6 space-y-2">
          {subjects?.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm font-medium text-slate-900">
                {subject.name}{" "}
                <span className="text-slate-400">
                  · {(subject as any).campuses?.name}
                </span>
              </span>
              <form action={deleteSubject}>
                <input type="hidden" name="id" value={subject.id} />
                <ConfirmSubmitButton
                  confirmMessage={`Delete "${subject.name}"? This also deletes its assignments and tests.`}
                  className="text-sm text-slate-400 hover:text-red-600"
                >
                  Delete
                </ConfirmSubmitButton>
              </form>
            </div>
          ))}
          {!subjects?.length && (
            <p className="text-sm text-slate-500">No subjects yet.</p>
          )}
        </div>
      </main>
    </>
  );
}
