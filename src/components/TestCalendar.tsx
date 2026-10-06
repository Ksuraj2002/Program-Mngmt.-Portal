"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export type CalendarTest = {
  id: string;
  title: string;
  test_date: string;
  subject_id: string;
  subject_name: string;
  campus_id: string;
  campus_name: string;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function monthLabel(year: number, month0: number) {
  return new Date(year, month0, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function hrefForMonth(year: number, month0: number) {
  const mm = String(month0 + 1).padStart(2, "0");
  return `?month=${year}-${mm}`;
}

export function TestCalendar({
  year,
  month0,
  todayIso,
  tests,
}: {
  year: number;
  month0: number;
  todayIso: string;
  tests: CalendarTest[];
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarTest[]>();
    for (const t of tests) {
      const list = map.get(t.test_date) || [];
      list.push(t);
      map.set(t.test_date, list);
    }
    return map;
  }, [tests]);

  const firstOfMonth = new Date(year, month0, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();

  const prevMonth0 = month0 === 0 ? 11 : month0 - 1;
  const prevYear = month0 === 0 ? year - 1 : year;
  const nextMonth0 = month0 === 11 ? 0 : month0 + 1;
  const nextYear = month0 === 11 ? year + 1 : year;

  const cells: Array<{ iso: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const mm = String(month0 + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    cells.push({ iso: `${year}-${mm}-${dd}`, day: d });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedTests = selectedDay ? byDay.get(selectedDay) || [] : [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <Link
            href={hrefForMonth(prevYear, prevMonth0)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            ← {monthLabel(prevYear, prevMonth0)}
          </Link>
          <h2 className="text-lg font-semibold text-slate-900">
            {monthLabel(year, month0)}
          </h2>
          <Link
            href={hrefForMonth(nextYear, nextMonth0)}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            {monthLabel(nextYear, nextMonth0)} →
          </Link>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 pb-1 text-center text-xs font-medium text-slate-500">
          {DAY_LABELS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((cell, idx) => {
            if (!cell) {
              return (
                <div
                  key={`e-${idx}`}
                  className="h-24 rounded-md bg-slate-50/50"
                />
              );
            }
            const dayTests = byDay.get(cell.iso) || [];
            const isToday = cell.iso === todayIso;
            const isSelected = cell.iso === selectedDay;
            const hasTests = dayTests.length > 0;
            return (
              <button
                key={cell.iso}
                type="button"
                onClick={() =>
                  setSelectedDay((s) => (s === cell.iso ? null : cell.iso))
                }
                className={`h-24 rounded-md border p-1.5 text-left transition ${
                  isSelected
                    ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                    : hasTests
                    ? "border-amber-200 bg-amber-50 hover:border-amber-400"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold ${
                      isToday
                        ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white"
                        : "text-slate-700"
                    }`}
                  >
                    {cell.day}
                  </span>
                  {hasTests && (
                    <span className="rounded-full bg-amber-200 px-1.5 text-[10px] font-semibold text-amber-900">
                      {dayTests.length}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 overflow-hidden">
                  {dayTests.slice(0, 2).map((t) => (
                    <div
                      key={t.id}
                      className="truncate text-[10px] text-slate-700"
                      title={`${t.title} · ${t.subject_name}`}
                    >
                      • {t.title}
                    </div>
                  ))}
                  {dayTests.length > 2 && (
                    <div className="text-[10px] text-slate-500">
                      +{dayTests.length - 2} more
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">
          {selectedDay
            ? new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Pick a day"}
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          {selectedDay
            ? selectedTests.length === 0
              ? "No tests scheduled."
              : `${selectedTests.length} test${
                  selectedTests.length === 1 ? "" : "s"
                } scheduled.`
            : "Click a day to see the tests on it."}
        </p>

        <div className="mt-3 space-y-2">
          {selectedTests.map((t) => (
            <Link
              key={t.id}
              href={`/campus/${t.campus_id}/subject/${t.subject_id}?type=test`}
              className="block rounded-md border border-slate-200 bg-white px-3 py-2 text-sm hover:border-brand-500 hover:bg-brand-50"
            >
              <div className="font-medium text-slate-900">{t.title}</div>
              <div className="mt-0.5 text-xs text-slate-500">
                {t.campus_name} · {t.subject_name}
              </div>
            </Link>
          ))}
        </div>
      </aside>
    </div>
  );
}
