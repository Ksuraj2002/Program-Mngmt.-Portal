"use client";

import Link from "next/link";
import { useState } from "react";
import { MarkdownField } from "@/components/MarkdownField";
import type { EntryType } from "@/types/database";

export function AddEntryForm({
  campusId,
  subjectId,
  activeType,
  today,
  closeHref,
  addEntry,
}: {
  campusId: string;
  subjectId: string;
  activeType: "all" | EntryType;
  today: string;
  closeHref: string;
  addEntry: (formData: FormData) => Promise<void> | void;
}) {
  const [type, setType] = useState<EntryType>(
    activeType === "test" ? "test" : "assignment"
  );

  return (
    <form
      action={addEntry}
      className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <input type="hidden" name="campusId" value={campusId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <input type="hidden" name="returnType" value={activeType} />

      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-lg font-medium text-slate-900">
            Add assignment / test
          </h2>
          <p className="text-sm text-slate-500">Fill in the details below.</p>
        </div>
        <Link
          href={closeHref}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Cancel
        </Link>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Type <span className="text-red-500">*</span>
        </label>
        <select
          name="type"
          required
          value={type}
          onChange={(e) => setType(e.target.value as EntryType)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="assignment">Assignment</option>
          <option value="test">Test</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          required
          placeholder="e.g. Unit 3 Problem Set"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className={type === "test" ? "grid gap-4 sm:grid-cols-2" : ""}>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Due date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="due_date"
            required
            defaultValue={today}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {type === "test" && (
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Test date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="test_date"
              required
              defaultValue={today}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Details / instructions
        </label>
        <div className="mt-1">
          <MarkdownField
            name="description"
            placeholder="Topics covered, submission instructions, links, etc."
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">
          Max marks (optional)
        </label>
        <input
          type="number"
          name="max_marks"
          min={0}
          step="0.5"
          placeholder="e.g. 100"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <button
        type="submit"
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Submit
      </button>
    </form>
  );
}
