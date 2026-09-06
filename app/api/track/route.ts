import { after } from "next/server";
import { track } from "@/lib/analytics-server";

/**
 * Beacon endpoint for the client tracker (see `components/SiteAnalytics.tsx`).
 *
 * Deliberately tiny: it validates the payload, answers `204` immediately and
 * does the storage write in `after()` so nothing about analytics is on the
 * critical path of the visitor's page.
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

  after(() => track(request, { kind, name, path, src, referrer, seconds, depth }));

  return new Response(null, { status: 204 });
}
