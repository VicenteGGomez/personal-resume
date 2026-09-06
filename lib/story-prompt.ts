/**
 * Handing an AI *who I am* rather than a task.
 *
 * The other two prompts in the IA window ask for something — a rewritten
 * profile, a CV in LaTeX. This one asks for nothing: it is the whole of me,
 * story and résumé together, pasted at the start of a conversation so that what
 * comes after — a scholarship application, a motivation letter, a cold email —
 * is written by something that already knows where I come from.
 *
 * `profile` is the Markdown export (see `lib/resume-markdown.ts`), already cut
 * down to the blocks worth carrying. The story travels inside it, as part of
 * the read-only Context block, which is why nothing here has to know how a
 * milestone is shaped.
 */

export interface StoryPromptOptions {
  /**
   * What this is being read for, in your own words — the scholarship, the
   * programme, the letter. Empty keeps it as general context.
   */
  purpose: string;
}

export function buildStoryPrompt(
  profile: string,
  options: StoryPromptOptions,
): string {
  const purpose = options.purpose.trim();
  return [
    "# Who I am",
    "",
    "**This is not a request.** It is context. Everything below is me — where I",
    "come from, what I have done, and how one led to the other — so that you know",
    "who you are talking to before I ask you for anything at all.",
    "",
    ...(purpose
      ? [
          "## What I am most likely to need next",
          "",
          ...purpose.split("\n").map((line) => `> ${line}`),
          "",
          "Read everything below with that in mind: what in my life speaks to it,",
          "what is missing, and where I would be stretching. Do not start writing it.",
          "",
        ]
      : [
          "## What this is for",
          "",
          "Nothing in particular yet. I will tell you in my next message — it is",
          "usually a scholarship, a programme, an application or a letter. Read this",
          "so that when I do, you already have the whole picture.",
          "",
        ]),
    "## How to read it",
    "",
    "- **My story** is the timeline: the parts of my life that explain the rest,",
    "  in my own words. It carries the *why*.",
    "- **The résumé** is the record: studies, jobs, awards, projects. It carries",
    "  the *what*, with dates.",
    "- Everything here is true and mine. **Do not invent a fact that is not in**",
    "  **it** — not a date, not a figure, not a place. If something you need is",
    "  missing, ask me for it.",
    "- Where the story and the résumé seem to disagree, do not choose for me:",
    "  say so and ask.",
    "- My voice is plain and concrete, and it is not a sales pitch. Keep it that",
    "  way when you eventually write anything for me.",
    "",
    "## Before you write anything",
    "",
    "**Write nothing yet.** When you have read it all, answer with two things and",
    "then stop:",
    "",
    "1. **Who you think I am**, in five or six lines — the thread you see running",
    "   through it, said back to me in your own words, including anything that",
    "   struck you as distinctive and anything that struck you as thin.",
    "2. **What you need from me** to be useful: the questions whose answers are",
    "   not anywhere below.",
    "",
    "Then wait. I will tell you what I need next.",
    "",
    "---",
    "",
    profile.trim(),
  ].join("\n");
}
