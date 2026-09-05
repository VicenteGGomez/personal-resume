import type { ResumeData } from "@/lib/resume-content";

/**
 * Asking an AI for a CV in LaTeX.
 *
 * The résumé site holds more than any CV ever will, so the CV is written *from*
 * it rather than kept alongside it: {@link buildCvLatexPrompt} bundles three
 * things — what to do, the whole profile as Markdown, and the LaTeX document to
 * copy the shape of — into one block of text to paste into an AI.
 *
 * The shape comes from `SharedContent.cvLatex`, which is editable in the admin
 * panel and is also where the finished CV is pasted back, so the format can
 * move on without a deploy (`lib/cv-latex-template.ts` holds the first one).
 *
 * Nothing here compiles anything: the answer is LaTeX source, and it is
 * compiled wherever you like.
 */

/** How much of the profile ends up in the CV. */
export type CvLength = "short" | "long";

export interface CvPromptOptions {
  length: CvLength;
  /** Link an entry to its page on the résumé site where one exists. */
  linkToSite: boolean;
  /** Tie the CV's own sections to each other (an award to its degree, say). */
  crossSections: boolean;
  /**
   * The company or role this CV is aimed at, in your own words. Empty asks for
   * a general-purpose CV instead.
   */
  audience: string;
}

export const CV_LENGTHS: Array<{
  key: CvLength;
  label: string;
  hint: string;
}> = [
  {
    key: "short",
    label: "Versión corta",
    hint: "Máximo 2 carillas · 1–2 puntos por trabajo",
  },
  {
    key: "long",
    label: "Versión extensa",
    hint: "3 carillas (4 solo si hace falta) · hasta 3 puntos, habilidades por cargo",
  },
];

/**
 * The whole ask, ready to paste: the instructions, the profile, and the format.
 *
 * `profile` is the Markdown export (see `lib/resume-markdown.ts`), already cut
 * down to the blocks that matter for this CV.
 */
export function buildCvLatexPrompt(
  profile: string,
  data: ResumeData,
  options: CvPromptOptions,
): string {
  const template = data.shared.cvLatex?.trim();
  return [
    "# What I need from you",
    "",
    ...intro(options),
    "",
    "## Before you write anything",
    "",
    "**Do not write the CV yet.** First tell me, in plain prose, what you plan to",
    "put in and what you plan to leave out, and why — especially anything you would",
    "cut to respect the page budget — and then wait for me to say yes. If you spot",
    "something worth improving that I did not ask for, raise it as a question",
    "rather than acting on it. Write the LaTeX only once I have confirmed.",
    "",
    "## The rules",
    "",
    ...rules(options),
    "",
    "## My profile",
    "",
    "Everything below is the source of truth for the CV's **content**. It is the",
    "fullest account of my professional life I have; the CV is a selection from it,",
    "never an addition to it. Do not invent a fact that is not here.",
    "",
    profile.trim(),
    "",
    "## The LaTeX format to follow",
    "",
    "The document below is my current CV. Treat it as the **shape only** — the",
    "preamble, the section order, and how a grouped employer, a bulleted role and a",
    "prose role are laid out. Its *content* is out of date: take every fact from my",
    "profile above, and take the contact details in the header from there too.",
    "Reproduce the preamble verbatim.",
    "",
    "````latex",
    template || "% (no template saved — use a clean, single-column article layout)",
    "````",
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/* The ask                                                                    */
/* -------------------------------------------------------------------------- */

function intro(options: CvPromptOptions): string[] {
  const which =
    options.length === "short" ? "a short CV" : "a full-length CV";
  const audience = options.audience.trim();
  if (!audience) {
    return [
      `Write ${which} in LaTeX, from my profile below, following the format at the`,
      "end. It is a general-purpose CV: no particular employer in mind, so keep it",
      "broadly applicable rather than tuned to one industry.",
    ];
  }
  return [
    `Write ${which} in LaTeX, from my profile below, following the format at the`,
    "end.",
    "",
    "**It is aimed at this, and everything should be chosen to maximise my chances",
    "there:**",
    "",
    ...audience
      .split("\n")
      .map((line) => `> ${line}`),
    "",
    "Lead with what matters to them, order the sections and the entries the same",
    "way, and use their vocabulary where mine says the same thing. Everything must",
    "stay true — tighten, reorder and reword, never embellish. When the page budget",
    "forces a cut, cut what is least relevant to them.",
  ];
}

function rules(options: CvPromptOptions): string[] {
  const out: string[] =
    options.length === "short"
      ? [
          "- **Length: 2 pages, and not one line more.** This is the hard constraint;",
          "  everything else gives way to it.",
          "- **1 to 2 bullets per job.** Never three or more. Each bullet runs 1–2",
          "  lines.",
          "- **A job that reads better as prose gets no bullets at all** — 2 to 3",
          "  lines of text under the role, as the template does for the tutor and",
          "  project-designer entries.",
          "- **Never leave a lone bullet.** If a job comes down to a single point,",
          "  write it as plain text under the role instead of a one-item list.",
        ]
      : [
          "- **Length: 3 pages.** Go to 4 only if the content genuinely needs it —",
          "  never to pad.",
          "- **Up to 3 bullets per job, averaging 1 to 2.** Three is the exception for",
          "  a role that really earns it, not the default. Each bullet runs 1–2 lines.",
          "- **A job that reads better as prose gets no bullets at all** — 2 to 3",
          "  lines of text under the role.",
          "- **Never leave a lone bullet.** If a job comes down to a single point,",
          "  write it as plain text under the role instead of a one-item list.",
          "- **You may add a skills line to an experience** where the profile lists",
          "  them for that position, kept short and concrete.",
        ];

  if (options.linkToSite) {
    out.push(
      "- **Link out to my site.** Where the profile gives an entry a page of its own",
      "  — a project URL, a publication link, a certificate — wrap the entry's title",
      "  in `\\href{…}{…}` so the reader can follow it. Only where a real URL exists",
      "  in the profile; never invent one.",
    );
  }
  if (options.crossSections) {
    out.push(
      "- **Tie the sections together.** Where the profile says an item belongs with",
      "  another — an award earned during a degree, a project that came out of a",
      "  role — make that visible in the wording, briefly, so the CV reads as one",
      "  story rather than five lists.",
    );
  }

  out.push(
    "- **Escape LaTeX properly:** `%`, `&`, `_`, `#`, `$` and `{}` in my text, and",
    "  accents in the template's style (`G\\'omez`, `Universit\\\"at`).",
    "- **Return one complete, compilable document** in a single ```latex block,",
    "  from `\\documentclass` to `\\end{document}`. No commentary inside it.",
    "- **Tell me afterwards** what you left out and roughly how many pages you",
    "  think it comes to.",
  );
  return out;
}
