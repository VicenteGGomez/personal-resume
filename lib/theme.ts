/**
 * Day/night theme plumbing, shared by the server — which stamps `data-theme` on
 * `<html>` — and the visitor-facing toggle.
 *
 * Three values live in that attribute:
 *   - "light" / "dark" — an explicit pick: day or night.
 *   - "system"         — defer to the visitor's device (`prefers-color-scheme`).
 *
 * Tailwind's `dark:` variant is wired to the attribute in `app/globals.css`, so
 * "system" is resolved in CSS alone: no bootstrap script, no flash of the wrong
 * theme on first paint, and it keeps working with JavaScript disabled.
 */

/** What the admin can pick as the site-wide default. */
export type ThemeChoice = "light" | "dark" | "system";

/** What a visitor can pick for themselves — day or night, never "system". */
export type ThemeMode = "light" | "dark";

/** Cookie holding the visitor's own pick. Absent = follow the site default. */
export const THEME_COOKIE = "theme";

/** A year, so a visitor's pick survives between visits. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Coerce unknown input into a ThemeChoice; anything else means "system". */
export function asThemeChoice(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

/** The visitor's cookie value, or null when they have not picked one. */
export function asThemeMode(value: unknown): ThemeMode | null {
  return value === "light" || value === "dark" ? value : null;
}

/**
 * The value to stamp on `<html>`: a visitor's own pick wins over the admin
 * default. Both are read defensively, so content saved before `defaultTheme`
 * existed just falls back to "system".
 */
export function resolveTheme(
  visitorPick: unknown,
  siteDefault: unknown,
): ThemeChoice {
  return asThemeMode(visitorPick) ?? asThemeChoice(siteDefault);
}
