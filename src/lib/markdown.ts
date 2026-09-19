import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ breaks: true, gfm: true });

export function renderMarkdown(source: string | null | undefined): string {
  if (!source) return "";
  const html = marked.parse(source, { async: false }) as string;
  return DOMPurify.sanitize(html);
}
