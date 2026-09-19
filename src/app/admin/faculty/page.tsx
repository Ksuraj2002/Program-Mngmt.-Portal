import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TopNav } from "@/components/TopNav";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import {
  addFaculty,
  assignSubject,
  removeFaculty,
  setRole,
  unassignSubject,
} from "./actions";

export default async function AdminFacultyPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    tempPassword?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  const { profile } = await requireAdmin();
  const supabase = await createClient();

  const [{ data: profiles }, { data: subjects }, { data: mappings }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("full_name"),
      supabase.from("subjects").select("*, campuses(name)").order("name"),
      supabase.from("faculty_subjects").select("*"),
    ]);

  const subjectsByFaculty = new Map<string, Set<string>>();
  mappings?.forEach((m) => {
    if (!subjectsByFaculty.has(m.faculty_id)) {
      subjectsByFaculty.set(m.faculty_id, new Set());
    }
    subjectsByFaculty.get(m.faculty_id)!.add(m.subject_id);
  });

  return (
    <>
      <TopNav profile={profile} />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <Link href="/admin" className="text-sm text-brand-600">
          ← Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Faculty
        </h1>

        {resolvedSearchParams.error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {resolvedSearchParams.error}
          </p>
        )}
        {resolvedSearchParams.created && (
          <div className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <p>
              Account created for <strong>{resolvedSearchParams.created}</strong>.
            </p>
            <p>
              Temporary password:{" "}
              <code className="rounded bg-emerald-100 px-1.5 py-0.5">
                {resolvedSearchParams.tempPassword}
              </code>
            </p>
            <p className="mt-1 text-emerald-700">
              Share this with them securely — it won&apos;t be shown again.
              There is no self-service password reset yet; if they need a
              new password, remove and re-add their account.
            </p>
          </div>
        )}

        <form
          action={addFaculty}
          className="mt-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <input
            type="text"
            name="full_name"
            required
            placeholder="Full name"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="email"
            name="email"
            required
            placeholder="Email"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create account
          </button>
        </form>

        <div className="mt-8 space-y-4">
          {profiles?.map((person) => {
            const assigned = subjectsByFaculty.get(person.id) || new Set();
            const unassigned = subjects?.filter((s) => !assigned.has(s.id));

            return (
              <div
                key={person.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-slate-900">
                      {person.full_name}
                    </p>
                    <p className="text-xs text-slate-400">{person.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <form action={setRole} className="flex items-center gap-1">
                      <input type="hidden" name="facultyId" value={person.id} />
                      <select
                        name="role"
                        defaultValue={person.role}
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="faculty">Faculty</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-slate-300 px-2 py-1 text-sm hover:bg-slate-50"
                      >
                        Save
                      </button>
                    </form>
                    {person.id !== profile.id && (
                      <form action={removeFaculty}>
                        <input
                          type="hidden"
                          name="facultyId"
                          value={person.id}
                        />
                        <ConfirmSubmitButton
                          confirmMessage={`Remove ${person.full_name}? They will lose access immediately.`}
                          className="text-sm text-slate-400 hover:text-red-600"
                        >
                          Remove
                        </ConfirmSubmitButton>
                      </form>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {[...assigned].map((subjectId) => {
                    const subject = subjects?.find((s) => s.id === subjectId);
                    if (!subject) return null;
                    return (
                      <form key={subjectId} action={unassignSubject}>
                        <input
                          type="hidden"
                          name="facultyId"
                          value={person.id}
                        />
                        <input
                          type="hidden"
                          name="subjectId"
                          value={subjectId}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
                          title="Click to unassign"
                        >
                          {subject.name} ({(subject as any).campuses?.name})
                          <span aria-hidden>×</span>
                        </button>
                      </form>
                    );
                  })}
                </div>

                {!!unassigned?.length && (
                  <form
                    action={assignSubject}
                    className="mt-3 flex gap-2"
                  >
                    <input type="hidden" name="facultyId" value={person.id} />
                    <select
                      name="subjectId"
                      required
                      defaultValue=""
                      className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    >
                      <option value="" disabled>
                        Assign a subject...
                      </option>
                      {unassigned.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({(subject as any).campuses?.name})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50"
                    >
                      Assign
                    </button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
