/**
 * A tiny, dependency-free Markdown → HTML renderer.
 *
 * Only the authenticated admin authors this content, but we still treat it as
 * untrusted: every character is HTML-escaped before any tag we emit is added,
 * and link URLs are restricted to http(s)/mailto/relative. The result is safe
 * to inject with `dangerouslySetInnerHTML`.
 *
 * Supported: headings (#, ##, ###), bold, italic, inline code, fenced code,
 * [text](url) links, unordered/ordered lists, blockquotes, horizontal rules,
 * and blank-line-separated paragraphs.
 */

// Private-Use-Area sentinels used to shield inline-code spans from the other
// inline passes. Built at runtime so no control characters live in the source.
const CODE_OPEN = String.fromCharCode(0xe000);
const CODE_CLOSE = String.fromCharCode(0xe001);

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Allow only safe URL schemes; return null to render the link as plain text. */
function safeUrl(raw: string): string | null {
  const url = raw.trim();
  if (/^(https?:|mailto:)/i.test(url)) return url;
  if (/^[/#]/.test(url)) return url; // site-relative or in-page anchor
  return null;
}

/** Render inline spans (code, links, bold, italic) inside a block of text. */
function inline(text: string): string {
  // Pull inline code out first so its contents are never treated as markdown.
  const codes: string[] = [];
  let s = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    codes.push(`<code>${escapeHtml(code)}</code>`);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });

  s = escapeHtml(s);

  // Links: [label](url) — url is already escaped, so quotes can't break out.
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label: string, url: string) => {
    const safe = safeUrl(url);
    if (!safe) return label;
    const rel = /^https?:/i.test(safe)
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
    return `<a href="${safe}"${rel}>${label}</a>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  s = s.replace(/_([^_]+)_/g, "<em>$1</em>");

  // Restore inline code spans.
  s = s.replace(
    new RegExp(`${CODE_OPEN}(\\d+)${CODE_CLOSE}`, "g"),
    (_m, i: string) => codes[Number(i)] ?? "",
  );
  return s;
}

export function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let paragraph: string[] = [];
  let i = 0;

  const flush = () => {
    if (paragraph.length) {
      out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block ```
    if (/^```/.test(line)) {
      flush();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1; // skip the closing fence
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // Headings # / ## / ###
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // Horizontal rule (checked before lists so --- isn't read as a bullet)
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      out.push("<hr />");
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      flush();
      const buf: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote>${inline(buf.join(" "))}</blockquote>`);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flush();
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    // Blank line separates paragraphs
    if (/^\s*$/.test(line)) {
      flush();
      i += 1;
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flush();
  return out.join("\n");
}
