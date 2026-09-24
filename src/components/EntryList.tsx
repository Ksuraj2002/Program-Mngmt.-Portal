"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Entry } from "@/types/database";

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

function buildCopyText(entry: EntryView) {
  const lines: string[] = [];
  lines.push(entry.title);
  lines.push(
    `${entry.type === "test" ? "Test" : "Assignment"} · Due ${formatDate(
      entry.due_date
    )}`
  );
  if (entry.test_date) {
    lines.push(`Test date: ${formatDate(entry.test_date)}`);
  }
  if (entry.max_marks != null) {
    lines.push(`Max marks: ${entry.max_marks}`);
  }
  if (entry.createdByName) {
    lines.push(`Added by: ${entry.createdByName}`);
  }
  if (entry.description) {
    lines.push("");
    lines.push(entry.description);
  }
  return lines.join("\n");
}

export function EntryList({
  entries,
  canManage,
  campusId,
  subjectId,
  initialType,
  showAddButton,
  addFormHref,
  deleteEntry,
}: {
  entries: EntryView[];
  canManage: boolean;
  campusId: string;
  subjectId: string;
  initialType: EntryTypeFilter;
  showAddButton: boolean;
  addFormHref: string;
  deleteEntry: (formData: FormData) => Promise<void> | void;
}) {
  const [activeType, setActiveType] = useState<EntryTypeFilter>(initialType);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function handleCopy(entry: EntryView) {
    const text = buildCopyText(entry);
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
    setCopiedId(entry.id);
    setTimeout(() => {
      setCopiedId((current) => (current === entry.id ? null : current));
    }, 1500);
  }

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
          return (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <button
                type="button"
                onClick={() =>
                  setExpanded((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))
                }
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                aria-expanded={isOpen}
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
                <svg
                  className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${
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
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 px-5 py-4">
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

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopy(entry)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
                      {copiedId === entry.id ? "Copied!" : "Copy"}
                    </button>

                    {canManage && (
                      <form action={deleteEntry}>
                        <input type="hidden" name="campusId" value={campusId} />
                        <input type="hidden" name="subjectId" value={subjectId} />
                        <input type="hidden" name="entryId" value={entry.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </form>
                    )}
                  </div>
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
