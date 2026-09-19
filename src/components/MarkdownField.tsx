"use client";

import { useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

type ToolbarAction =
  | { kind: "wrap"; before: string; after?: string; placeholder: string }
  | { kind: "prefix"; prefix: string }
  | { kind: "link" };

const TOOLBAR_BUTTONS: { label: string; title: string; action: ToolbarAction }[] = [
  {
    label: "B",
    title: "Bold",
    action: { kind: "wrap", before: "**", placeholder: "bold text" },
  },
  {
    label: "I",
    title: "Italic",
    action: { kind: "wrap", before: "*", placeholder: "italic text" },
  },
  {
    label: "</>",
    title: "Code",
    action: { kind: "wrap", before: "`", placeholder: "code" },
  },
  {
    label: "•",
    title: "Bullet list",
    action: { kind: "prefix", prefix: "- " },
  },
  {
    label: "1.",
    title: "Numbered list",
    action: { kind: "prefix", prefix: "1. " },
  },
  {
    label: "🔗",
    title: "Link",
    action: { kind: "link" },
  },
];

export function MarkdownField({
  name,
  defaultValue = "",
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [maximized, setMaximized] = useState(false);
  const [preview, setPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fieldSizeClass = maximized ? "flex-1" : "min-h-[220px]";

  function applyEdit(nextValue: string, selectionStart: number, selectionEnd: number) {
    setValue(nextValue);
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function runToolbarAction(action: ToolbarAction) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);

    if (action.kind === "wrap") {
      const after = action.after ?? action.before;
      const isMultiline = action.before === "`" && selected.includes("\n");
      const before = isMultiline ? "```\n" : action.before;
      const afterText = isMultiline ? "\n```" : after;
      const text = selected || action.placeholder;
      const nextValue =
        value.slice(0, start) + before + text + afterText + value.slice(end);
      applyEdit(nextValue, start + before.length, start + before.length + text.length);
      return;
    }

    if (action.kind === "prefix") {
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const lineEndIndex = value.indexOf("\n", end);
      const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      const prefixed = lines
        .map((line, i) =>
          action.prefix === "1. " ? `${i + 1}. ${line}` : action.prefix + line
        )
        .join("\n");
      const nextValue = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
      applyEdit(nextValue, lineStart, lineStart + prefixed.length);
      return;
    }

    if (action.kind === "link") {
      const text = selected || "link text";
      const snippet = `[${text}](https://)`;
      const nextValue = value.slice(0, start) + snippet + value.slice(end);
      const urlStart = start + text.length + 3;
      applyEdit(nextValue, urlStart, urlStart + "https://".length);
    }
  }

  return (
    <>
      {maximized && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMaximized(false)}
        />
      )}
      <div
        className={
          maximized
            ? "fixed inset-4 z-50 flex flex-col rounded-xl border border-slate-300 bg-white p-4 shadow-2xl sm:inset-10"
            : "relative"
        }
      >
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {!preview && (
            <div className="flex gap-1">
              {TOOLBAR_BUTTONS.map((button) => (
                <button
                  key={button.title}
                  type="button"
                  title={button.title}
                  onClick={() => runToolbarAction(button.action)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}
          <div className="ml-auto flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
            >
              {preview ? "Edit" : "Preview"}
            </button>
            <button
              type="button"
              onClick={() => setMaximized((m) => !m)}
              className="rounded-md border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-50"
            >
              {maximized ? "Minimize" : "Maximize"}
            </button>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          name={name}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${fieldSizeClass} ${
            preview ? "hidden" : "block resize-y"
          }`}
        />

        {preview && (
          <div
            className={`prose prose-sm max-w-none overflow-y-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 ${fieldSizeClass}`}
            dangerouslySetInnerHTML={{
              __html:
                renderMarkdown(value) ||
                '<p class="text-slate-400">Nothing to preview yet.</p>',
            }}
          />
        )}
      </div>
    </>
  );
}
