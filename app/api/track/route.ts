import { after } from "next/server";
import { checkBotId } from "botid/server";
import { track, trackBot } from "@/lib/analytics-server";
import type { BotReason } from "@/lib/analytics-types";

/**
 * Beacon endpoint for the client tracker (see `components/SiteAnalytics.tsx`).
 *
 * Deliberately tiny: it validates the payload, answers `204` immediately and
 * does the storage write in `after()` so nothing about analytics is on the
 * critical path of the visitor's page.
 *
 * Before a hit counts as a person it has to come from this site and pass
 * Vercel BotID (wired up in `instrumentation-client.ts`). A hit that fails is
 * still answered `204` — a bot learns nothing — and only bumps the bot counter.
 */

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2048;

interface TrackBody {
  kind?: unknown;
  name?: unknown;
  path?: unknown;
  src?: unknown;
  ref?: unknown;
  seconds?: unknown;
  depth?: unknown;
  /** `navigator.webdriver`, reported by the client. */
  wd?: unknown;
}

function str(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value ? value.slice(0, max) : undefined;
}

/** A non-negative whole number, clamped. Anything else is dropped. */
function num(value: unknown, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.min(Math.round(value), max);
}

/**
 * Why this hit isn't a person, or `null` when it is. Leaving pings skip BotID:
 * they go out as beacons, which can't carry its header, and the store only
 * files them against a visit a person already opened.
 */
async function botReason(
  request: Request,
  body: TrackBody | null,
  measurement: boolean,
): Promise<BotReason | null> {
  // Browsers say where a request comes from; anything posting from another
  // site (or a page saved to disk) isn't a visit to this one.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return "foreign";
  if (body?.wd === true) return "webdriver";
  if (measurement) return null;
  try {
    const verdict = await checkBotId();
    if (verdict.isBot) return "botid";
  } catch (error) {
    // A BotID outage must not erase real visits: count the hit as before.
    console.error("analytics: BotID check failed", error);
  }
  return null;
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: TrackBody | null = null;
  try {
    body = (await request.json()) as TrackBody;
  } catch {
    return new Response(null, { status: 400 });
  }

  const kind = body?.kind === "event" ? "event" : "view";
  // Long enough for `publication:<uuid>`, the widest name we send.
  const name = str(body?.name, 60);
  if (kind === "event" && !name) return new Response(null, { status: 400 });

  const path = str(body?.path, 120);
  const src = str(body?.src, 40);
  const referrer = str(body?.ref, 200);

  // Only the leaving ping carries these; both are clamped to sane bounds.
  const seconds = num(body?.seconds, 3600);
  const depth = num(body?.depth, 100);

  const measurement = kind === "event" && /^(dwell|scroll):/.test(name ?? "");
  const bot = await botReason(request, body, measurement);

  if (bot) {
    // Count what would have opened a visit — a page view or a CV open — not
    // every click and ping the same bot sends after it.
    if (kind === "view" || name?.startsWith("cv:")) {
      after(() => trackBot(request, bot));
    }
  } else {
    after(() => track(request, { kind, name, path, src, referrer, seconds, depth }));
  }

  return new Response(null, { status: 204 });
}
