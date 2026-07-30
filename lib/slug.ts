/**
 * URL-slug helpers shared by the admin editor (client) and the normalizer
 * (server). Pure functions only — no Node or browser APIs — so both bundles can
 * import them.
 */

/** Turn arbitrary text into a lowercase, hyphenated, ASCII URL slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "") // strip accents (á -> a)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Produce a slug that is not already in `taken`, appending -2, -3, … on
 * collision. Falls back to `fallback` (then "project") when the input is empty.
 */
export function uniqueSlug(
  desired: string,
  taken: Set<string>,
  fallback: string,
): string {
  const base = slugify(desired) || slugify(fallback) || "project";
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}
