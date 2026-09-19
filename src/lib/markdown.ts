import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

marked.setOptions({ breaks: true, gfm: true });

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "h1",
  "h2",
  "img",
];

export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  const html = marked.parse(source, { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ["src", "alt"],
    },
  });
}
