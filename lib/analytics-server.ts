import "server-only";

import { createHash } from "node:crypto";
import { userAgent } from "next/server";
import { getSession } from "@/lib/auth";
import { dayKey, recordHit } from "@/lib/analytics-store";
import { OPT_OUT_COOKIE } from "@/lib/analytics-types";

/**
 * Turns an incoming request into an anonymous analytics hit.
 *
 * The visitor identifier is `sha256(ip + user-agent + secret + day)` truncated
 * to 12 hex characters: enough to count a person once per day, useless as an
 * identifier afterwards, and never reversible to an IP. Nothing is written to
 * the visitor's browser, so the site needs no cookie banner.
 */

export interface TrackOptions {
  kind: "view" | "event";
  /** Event name, e.g. `cv:en` or `contact:whatsapp`. */
  name?: string;
  /** Path being viewed. Defaults to the request's own pathname. */
  path?: string;
  /** `?src=` / `utm_source` value reported by the client. */
  src?: string;
  /** Referrer reported by the client; falls back to the `referer` header. */
  referrer?: string;
  /** Seconds spent on `path`, sent when the visitor leaves the page. */
  seconds?: number;
  /** Deepest scroll percentage reached on `path`. */
  depth?: number;
}

const SANITIZE = /[^a-zA-Z0-9:/._@-]/g;
/** City names keep letters (accents included), spaces and dashes. */
const SANITIZE_CITY = /[^\p{L}\p{N} .'-]/gu;

function clean(value: string | undefined, max: number): string {
  return (value ?? "").replace(SANITIZE, "").slice(0, max);
}

/**
 * True when this browser asked not to be counted. Read straight from the
 * request headers rather than through `cookies()`, so it works the same from
 * a route handler, a server action or an `after()` callback.
 */
function hasOptedOut(headers: Headers): boolean {
  const header = headers.get("cookie");
  if (!header) return false;
  return header
    .split(";")
    .some((part) => part.trim().startsWith(`${OPT_OUT_COOKIE}=`));
}

function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "";
}

function visitorHash(headers: Headers): string {
  const ip = clientIp(headers);
  const ua = headers.get("user-agent") ?? "";
  if (!ip && !ua) return "";
  // Rotating the salt daily makes the hash useless for cross-day tracking.
  const salt = process.env.SESSION_SECRET ?? "resume-analytics";
  return createHash("sha256")
    .update(`${ip}|${ua}|${salt}|${dayKey()}`)
    .digest("hex")
    .slice(0, 12);
}

/** Where this visit came from: explicit tag > referrer host > direct. */
function resolveSource(src: string, referrer: string, host: string): string {
  const tag = clean(src, 32).toLowerCase();
  if (tag) return tag;
  if (!referrer) return "direct";
  try {
    const { hostname } = new URL(referrer);
    // Internal navigation isn't a traffic source.
    if (!hostname || hostname === host) return "direct";
    return hostname.replace(/^www\./, "").slice(0, 32);
  } catch {
    return "direct";
  }
}

/** Paths that should never show up in the stats. */
function isIgnoredPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next")
  );
}

/**
 * Record a hit for this request. Never throws — analytics failures must not
 * affect the response. Dropped: bots, a logged-in admin (you, checking your
 * own site) and any browser carrying the opt-out cookie.
 */
export async function track(
  request: Request,
  options: TrackOptions,
): Promise<void> {
  try {
    const headers = request.headers;
    const { isBot, device, browser } = userAgent({ headers });
    if (isBot) return;
    if (hasOptedOut(headers)) return;

    const url = new URL(request.url);
    const rawPath = options.path ?? url.pathname;
    const pathname = clean(rawPath, 120) || "/";
    if (isIgnoredPath(pathname)) return;

    // Don't count your own visits while signed in to /admin.
    if (await getSession()) return;

    const referrer = options.referrer ?? request.headers.get("referer") ?? "";
    const country = clean(headers.get("x-vercel-ip-country") ?? "", 4) || "??";
    const rawCity = headers.get("x-vercel-ip-city") ?? "";
    let city = "";
    try {
      // Vercel percent-encodes the city header ("Ciudad%20de%20M%C3%A9xico").
      city = decodeURIComponent(rawCity).replace(SANITIZE_CITY, "").trim().slice(0, 40);
    } catch {
      city = "";
    }

    await recordHit({
      kind: options.kind,
      name: options.name ? clean(options.name, 40) : undefined,
      path: pathname,
      src: resolveSource(options.src ?? "", referrer, url.hostname),
      country,
      city,
      device: device.type ?? "desktop",
      browser: clean(browser.name ?? "", 24) || "unknown",
      visitorId: visitorHash(headers),
      seconds: options.seconds,
      depth: options.depth,
    });
  } catch (error) {
    console.error("analytics: track failed", error);
  }
}
