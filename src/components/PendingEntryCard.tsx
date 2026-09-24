"use client";

import Link from "next/link";
import { useState } from "react";
import type { EntryStatus, EntryType, Role } from "@/types/database";

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusLabel(status: EntryStatus): string {
  if (status === "done_by_tpm") return "Under review by faculty";
  if (status === "approved") return "Approved";
  return "Pending";
}

function statusChipClass(status: EntryStatus): string {
  if (status === "done_by_tpm") return "bg-yellow-100 text-yellow-800";
  if (status === "approved") return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-700";
}

export type PendingCardEntry = {
  id: string;
  type: EntryType;
  title: string;
  due_date: string;
  status: EntryStatus;
  change_request: string | null;
  submission_link: string | null;
  subject: {
    id: string;
    name: string;
    campus_id: string;
    campus_name: string;
  };
};

export function PendingEntryCard({
  entry,
  role,
  markEntryDone,
  approveEntry,
  requestEntryChanges,
}: {
  entry: PendingCardEntry;
  role: Role;
  markEntryDone: (formData: FormData) => Promise<void> | void;
  approveEntry: (formData: FormData) => Promise<void> | void;
  requestEntryChanges: (formData: FormData) => Promise<void> | void;
}) {
  const [showChanges, setShowChanges] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";
  const subjectHref = `/campus/${entry.subject.campus_id}/subject/${entry.subject.id}`;

  const showMarkDone = isAdmin && entry.status === "pending";
  const showFacultyReview = isFaculty && entry.status === "done_by_tpm";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
        <Link href={subjectHref} className="min-w-0 flex-1 group">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                entry.type === "test"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-brand-100 text-brand-700"
              }`}
            >
              {entry.type === "test" ? "Test" : "Assignment"}
            </span>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusChipClass(
                entry.status
              )}`}
            >
              {statusLabel(entry.status)}
            </span>
            {entry.change_request && (
              <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                Changes requested
              </span>
            )}
            <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-700">
              {entry.title}
            </h3>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {entry.subject.campus_name} · {entry.subject.name} · Due{" "}
            {formatDate(entry.due_date)}
          </p>
        </Link>

        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {showMarkDone && (
            <button
              type="button"
              onClick={() => setShowLinkInput((v) => !v)}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
            >
              {showLinkInput ? "Cancel" : "Mark as done"}
            </button>
          )}

          {showFacultyReview && (
            <>
              <form action={approveEntry}>
                <input
                  type="hidden"
                  name="campusId"
                  value={entry.subject.campus_id}
                />
                <input
                  type="hidden"
                  name="subjectId"
                  value={entry.subject.id}
                />
                <input type="hidden" name="entryId" value={entry.id} />
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Approve
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowChanges((v) => !v)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showChanges ? "Cancel" : "Request changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {showMarkDone && showLinkInput && (
        <form
          action={markEntryDone}
          className="mx-5 mb-4 space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3"
        >
          <input
            type="hidden"
            name="campusId"
            value={entry.subject.campus_id}
          />
          <input type="hidden" name="subjectId" value={entry.subject.id} />
          <input type="hidden" name="entryId" value={entry.id} />
          <label className="block text-xs font-medium text-slate-700">
            Attach a link (optional) — e.g. drive folder, doc URL
          </label>
          <input
            type="url"
            name="submission_link"
            placeholder="https://…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
          >
            Submit for review
          </button>
        </form>
      )}

      {isFaculty && entry.submission_link && (
        <div className="mx-5 mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          <span className="font-medium text-slate-700">Submitted link: </span>
          <a
            href={entry.submission_link}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-brand-600 hover:underline"
          >
            {entry.submission_link}
          </a>
        </div>
      )}

      {showFacultyReview && showChanges && (
        <form
          action={requestEntryChanges}
          className="mx-5 mb-4 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
        >
          <input
            type="hidden"
            name="campusId"
            value={entry.subject.campus_id}
          />
          <input type="hidden" name="subjectId" value={entry.subject.id} />
          <input type="hidden" name="entryId" value={entry.id} />
          <label className="block text-xs font-medium text-slate-700">
            What changes are needed?
          </label>
          <textarea
            name="change_request"
            required
            rows={3}
            placeholder="Describe the changes you'd like the TPM to make."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
          >
            Send request
          </button>
        </form>
      )}
    </div>
  );
}
