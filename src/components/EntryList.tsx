"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Entry, EntryStatus, Role } from "@/types/database";

type EntryTypeFilter = "all" | "assignment" | "test";

type EntryView = Entry & {
  createdByName: string | null;
  descriptionHtml: string;
};

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

function buildCopyText(entry: EntryView) {
  const lines: string[] = [];
  lines.push(entry.title);
  lines.push(
    `${entry.type === "test" ? "Test" : "Assignment"} · Due ${formatDate(
      entry.due_date
    )}`
  );
  if (entry.test_date) lines.push(`Test date: ${formatDate(entry.test_date)}`);
  if (entry.max_marks != null) lines.push(`Max marks: ${entry.max_marks}`);
  if (entry.createdByName) lines.push(`Added by: ${entry.createdByName}`);
  lines.push(`Status: ${statusLabel(entry.status)}`);
  if (entry.description) {
    lines.push("");
    lines.push(entry.description);
  }
  if (entry.change_request) {
    lines.push("");
    lines.push(`Change request: ${entry.change_request}`);
  }
  return lines.join("\n");
}

function CopyButton({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      type="button"
      onClick={handle}
      className={`inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 ${className}`}
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden
      >
        <path d="M7 3a2 2 0 00-2 2v10a2 2 0 002 2h6a2 2 0 002-2V5a2 2 0 00-2-2H7z" />
        <path d="M3 7a2 2 0 012-2v10a2 2 0 002 2h6a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function EntryList({
  entries,
  canManage,
  role,
  campusId,
  subjectId,
  initialType,
  showAddButton,
  addFormHref,
  deleteEntry,
  markEntryDone,
  approveEntry,
  requestEntryChanges,
}: {
  entries: EntryView[];
  canManage: boolean;
  role: Role;
  campusId: string;
  subjectId: string;
  initialType: EntryTypeFilter;
  showAddButton: boolean;
  addFormHref: string;
  deleteEntry: (formData: FormData) => Promise<void> | void;
  markEntryDone: (formData: FormData) => Promise<void> | void;
  approveEntry: (formData: FormData) => Promise<void> | void;
  requestEntryChanges: (formData: FormData) => Promise<void> | void;
}) {
  const [activeType, setActiveType] = useState<EntryTypeFilter>(initialType);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [requestingChanges, setRequestingChanges] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      entries.filter((e) => activeType === "all" || e.type === activeType),
    [entries, activeType]
  );

  const filters: [EntryTypeFilter, string][] = [
    ["all", "All"],
    ["assignment", "Assignments"],
    ["test", "Tests"],
  ];

  const isAdmin = role === "admin";
  const isFaculty = role === "faculty";

  return (
    <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {filters.map(([type, label]) => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeType === type
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {canManage && showAddButton && (
          <Link
            href={addFormHref}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add assignment / test
          </Link>
        )}
      </div>

      <div className="mt-8 space-y-3">
        {filtered.map((entry) => {
          const isOpen = !!expanded[entry.id];
          const copyText = buildCopyText(entry);
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                }
                className="flex w-full cursor-pointer items-start justify-between gap-3 px-5 py-4 text-left"
                role="button"
                aria-expanded={isOpen}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setExpanded((prev) => ({
                      ...prev,
                      [entry.id]: !prev[entry.id],
                    }));
                  }
                }}
              >
                <div className="min-w-0 flex-1">
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
                    <h3 className="truncate text-base font-semibold text-slate-900">
                      {entry.title}
                    </h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Due {formatDate(entry.due_date)}
                    {entry.type === "test" && entry.test_date &&
                      ` · Test ${formatDate(entry.test_date)}`}
                    {entry.max_marks != null && ` · ${entry.max_marks} marks`}
                    {entry.createdByName && ` · added by ${entry.createdByName}`}
                  </p>
                </div>

                <div
                  className="flex flex-shrink-0 items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CopyButton text={copyText} />
                  {isAdmin && entry.status === "pending" && (
                    <form action={markEntryDone}>
                      <input type="hidden" name="campusId" value={campusId} />
                      <input type="hidden" name="subjectId" value={subjectId} />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                      >
                        Mark as done
                      </button>
                    </form>
                  )}
                  {canManage && (
                    <form action={deleteEntry}>
                      <input type="hidden" name="campusId" value={campusId} />
                      <input type="hidden" name="subjectId" value={subjectId} />
                      <input type="hidden" name="entryId" value={entry.id} />
                      <button
                        type="submit"
                        onClick={(e) => {
                          if (
                            !window.confirm(
                              "Delete this entry? This cannot be undone."
                            )
                          ) {
                            e.preventDefault();
                          }
                        }}
                        className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </form>
                  )}
                  <svg
                    className={`h-5 w-5 text-slate-400 transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.4a.75.75 0 01-1.08 0l-4.25-4.4a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
                  {entry.status === "pending" && entry.change_request && (
                    <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      <p className="font-medium">Changes requested by faculty:</p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {entry.change_request}
                      </p>
                    </div>
                  )}

                  {entry.descriptionHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-slate-700"
                      dangerouslySetInnerHTML={{ __html: entry.descriptionHtml }}
                    />
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      No details provided.
                    </p>
                  )}

                  {isFaculty && entry.status === "done_by_tpm" && (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <form action={approveEntry}>
                        <input type="hidden" name="campusId" value={campusId} />
                        <input
                          type="hidden"
                          name="subjectId"
                          value={subjectId}
                        />
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button
                          type="submit"
                          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() =>
                          setRequestingChanges((prev) => ({
                            ...prev,
                            [entry.id]: !prev[entry.id],
                          }))
                        }
                        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        {requestingChanges[entry.id]
                          ? "Cancel"
                          : "Request changes"}
                      </button>
                    </div>
                  )}

                  {isFaculty &&
                    entry.status === "done_by_tpm" &&
                    requestingChanges[entry.id] && (
                      <form
                        action={requestEntryChanges}
                        className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <input type="hidden" name="campusId" value={campusId} />
                        <input type="hidden" name="subjectId" value={subjectId} />
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
              )}
            </div>
          );
        })}
        {!filtered.length && (
          <p className="text-sm text-slate-500">
            {activeType === "all"
              ? "No assignments or tests added yet."
              : `No ${activeType}s added yet.`}
          </p>
        )}
      </div>
    </>
  );
}
