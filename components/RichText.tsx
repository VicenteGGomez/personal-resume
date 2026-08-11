import { renderInlineMarkdown, renderMarkdown } from "@/lib/markdown";

/**
 * Render a résumé field as Markdown. Both variants sanitize their input in
 * `lib/markdown.ts` (HTML is escaped, link URLs are restricted), so the output
 * is safe to inject. Empty input renders nothing.
 */

/**
 * Inline formatting only — bold, italic, links, inline code. Renders a `<span>`
 * so it can sit inside an already-styled element (heading, subtitle, list-like
 * text) without introducing block structure. Color/size come from the parent.
 */
export function InlineMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;
  return (
    <span
      className={className ? `richtext ${className}` : "richtext"}
      dangerouslySetInnerHTML={{ __html: renderInlineMarkdown(text) }}
    />
  );
}

/**
 * Full block Markdown — paragraphs, lists, headings, quotes, code. Renders a
 * `<div class="markdown">`; block spacing comes from the shared `.markdown` CSS
 * while text color/size are supplied through `className`.
 */
export function BlockMarkdown({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;
  return (
    <div
      className={className ? `markdown ${className}` : "markdown"}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  );
}
