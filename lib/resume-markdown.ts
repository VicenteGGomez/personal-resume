import type { Experience, ResumeData } from "@/lib/resume-content";

/**
 * Renders the résumé as a single, self-contained Markdown document — intended
 * to be pasted into an AI assistant as full context about Vicente's
 * professional life. Only the English content is exported: the language-
 * specific fields come from `data.en`, plus the shared identity/contact and
 * the (English-only) projects and publications.
 *
 * It is built from the in-editor `ResumeData` so it reflects the current state,
 * including edits that haven't been saved yet. Arrays that may be absent on
 * older stored content are defaulted here (see `lib/normalize.ts` for the
 * canonical shape).
 */
export function resumeToMarkdown(data: ResumeData): string {
  const { shared, en } = data;
  const projects = (data.projects ?? []).filter((p) => p && (p.title || p.body));

  // Section blocks, each with no leading/trailing blank lines. Joined with a
  // single blank line so the spacing between sections is uniform.
  const blocks: string[] = [];

  /* --- Header --------------------------------------------------------------- */

  const name = shared.name?.trim() || "Professional Profile";
  blocks.push(`# ${name} — Professional Profile`);
  blocks.push(
    "> Structured Markdown export of my résumé, meant to be used as context " +
      "for an AI assistant about my professional life. All content is in English.",
  );

  /* --- Identity & contact --------------------------------------------------- */

  const contact: string[] = [];
  const addContact = (label: string, value?: string) => {
    const v = value?.trim();
    if (v) contact.push(`- **${label}:** ${v}`);
  };
  addContact("Name", shared.name);
  addContact("Location", shared.location);
  addContact("Email", shared.email);
  addContact("LinkedIn", shared.linkedin);
  if (shared.whatsapp?.trim()) {
    const wa = shared.whatsapp.trim();
    const value = /^https?:\/\//i.test(wa)
      ? wa
      : `https://wa.me/${wa.replace(/[^\d]/g, "")}`;
    contact.push(`- **WhatsApp:** ${value}`);
  }
  addContact("Full CV (PDF)", shared.cvEn);
  if (contact.length) {
    blocks.push(["## Identity & Contact", "", ...contact].join("\n"));
  }

  /* --- Summary -------------------------------------------------------------- */

  const summary: string[] = ["## Summary", ""];
  if (en.badgeEnabled && en.badge?.trim()) {
    summary.push(`**Availability:** ${en.badge.trim()}`, "");
  }
  if (en.subtitle?.trim()) summary.push(en.subtitle.trim(), "");
  if (en.description?.trim()) summary.push(en.description.trim(), "");
  if (summary.length > 2) blocks.push(trimTrailingBlanks(summary).join("\n"));

  /* --- Positioning ---------------------------------------------------------- */

  if (en.about?.trim()) {
    const title = en.aboutTitle?.trim() || "Positioning";
    blocks.push([`## ${title}`, "", en.about.trim()].join("\n"));
  }

  /* --- Highlights ----------------------------------------------------------- */

  const highlights = (en.highlights ?? []).filter((h) => h.value || h.label);
  if (highlights.length) {
    const rows = highlights.map((h) => {
      const value = h.value?.trim();
      const label = h.label?.trim();
      if (value && label) return `- **${value}** — ${label}`;
      return `- ${value || label}`;
    });
    blocks.push(["## Highlights", "", ...rows].join("\n"));
  }

  /* --- Experience ----------------------------------------------------------- */

  // Map each experience to any projects that reference it, so the project shows
  // up as a pointer under the relevant role.
  const projectsByExperience = new Map<string, typeof projects>();
  for (const p of projects) {
    const id = p.experienceId?.trim();
    if (!id) continue;
    const list = projectsByExperience.get(id) ?? [];
    list.push(p);
    projectsByExperience.set(id, list);
  }

  const experiences = (en.experiences ?? []).filter(
    (e) => e.role || e.place || e.text,
  );
  if (experiences.length) {
    const items = experiences.map((exp) => {
      const parts: string[] = [`### ${heading(exp.role, exp.place)}`];
      if (exp.date?.trim()) parts.push(`*${exp.date.trim()}*`);
      if (exp.text?.trim()) parts.push("", exp.text.trim());
      const related = projectsByExperience.get(exp.id) ?? [];
      for (const p of related) {
        parts.push("", `Related project: ${projectLink(p)}`);
      }
      return parts.join("\n");
    });
    blocks.push(["## Experience", "", items.join("\n\n")].join("\n"));
  }

  /* --- Education ------------------------------------------------------------ */

  const education = (en.education ?? []).filter(
    (e) => e.title || e.place || e.text,
  );
  if (education.length) {
    const items = education.map((ed) => {
      const parts: string[] = [`### ${heading(ed.title, ed.place)}`];
      if (ed.date?.trim()) parts.push(`*${ed.date.trim()}*`);
      if (ed.text?.trim()) parts.push("", ed.text.trim());
      return parts.join("\n");
    });
    blocks.push(["## Education", "", items.join("\n\n")].join("\n"));
  }

  /* --- Skills --------------------------------------------------------------- */

  const skills = (en.skills ?? []).filter((s) => s.title || s.text);
  if (skills.length) {
    const rows = skills.map((s) => {
      const title = s.title?.trim();
      const text = s.text?.trim();
      if (title && text) return `- **${title}:** ${text}`;
      return `- ${title || text}`;
    });
    blocks.push(["## Skills", "", ...rows].join("\n"));
  }

  /* --- Projects ------------------------------------------------------------- */

  if (projects.length) {
    const expById = new Map<string, Experience>(
      (en.experiences ?? []).map((e) => [e.id, e]),
    );
    const items = projects.map((p) => {
      const parts: string[] = [`### ${p.title?.trim() || "Untitled project"}`];

      const meta: string[] = [];
      if (p.date?.trim()) meta.push(`*${p.date.trim()}*`);
      const exp = p.experienceId ? expById.get(p.experienceId) : undefined;
      if (exp) meta.push(`Related experience: ${heading(exp.role, exp.place)}`);
      if (meta.length) parts.push(meta.join(" · "));
      if (p.slug?.trim()) parts.push(`URL: /en/projects/${p.slug.trim()}`);

      if (p.summary?.trim()) parts.push("", `**Summary:** ${p.summary.trim()}`);
      if (p.body?.trim()) parts.push("", demoteHeadings(p.body.trim(), 2));

      const links = (p.links ?? []).filter((l) => l.label || l.url);
      if (links.length) {
        parts.push("", "**Links:**");
        for (const l of links) {
          const label = l.label?.trim() || l.url?.trim();
          parts.push(`- [${label}](${l.url?.trim()})`);
        }
      }
      return parts.join("\n");
    });
    blocks.push(["## Projects", "", items.join("\n\n")].join("\n"));
  }

  /* --- Publications --------------------------------------------------------- */

  const publications = (shared.publications ?? []).filter(
    (p) => p.title || p.excerpt || p.url,
  );
  if (publications.length) {
    const items = publications.map((p) => {
      const parts: string[] = [`### ${p.title?.trim() || "Untitled post"}`];
      const meta: string[] = [];
      if (p.date?.trim()) meta.push(`*${p.date.trim()}*`);
      if (p.url?.trim()) meta.push(`[View post](${p.url.trim()})`);
      if (meta.length) parts.push(meta.join(" · "));
      if (p.excerpt?.trim()) parts.push("", p.excerpt.trim());
      return parts.join("\n");
    });
    blocks.push(["## Publications", "", items.join("\n\n")].join("\n"));
  }

  return blocks.join("\n\n") + "\n";
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

/** "Role — Place", omitting whichever side is empty. */
function heading(a?: string, b?: string): string {
  const left = a?.trim();
  const right = b?.trim();
  if (left && right) return `${left} — ${right}`;
  return left || right || "—";
}

function projectLink(p: { title: string; slug: string }): string {
  const title = p.title?.trim() || "project";
  const slug = p.slug?.trim();
  return slug ? `[${title}](/en/projects/${slug})` : title;
}

/** Drop trailing empty strings so a block never ends with blank lines. */
function trimTrailingBlanks(lines: string[]): string[] {
  const out = [...lines];
  while (out.length && out[out.length - 1] === "") out.pop();
  return out;
}

/**
 * Increase the depth of ATX headings in a Markdown fragment by `by` levels
 * (capped at 6) so an embedded body's `## Context` nests under the surrounding
 * `### Project` heading instead of competing with the document's own sections.
 * Lines inside fenced code blocks are left untouched.
 */
function demoteHeadings(md: string, by: number): string {
  let inFence = false;
  return md
    .split("\n")
    .map((line) => {
      const fence = line.match(/^\s*(```|~~~)/);
      if (fence) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const h = line.match(/^(#{1,6})(\s.*)$/);
      if (!h) return line;
      const level = Math.min(6, h[1].length + by);
      return "#".repeat(level) + h[2];
    })
    .join("\n");
}
