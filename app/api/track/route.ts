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
}

function str(value: unknown, max: number): string | undefined {
  return typeof value === "string" && value ? value.slice(0, max) : undefined;
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
  const name = str(body?.name, 40);
  if (kind === "event" && !name) return new Response(null, { status: 400 });

  const path = str(body?.path, 120);
  const src = str(body?.src, 40);
  const referrer = str(body?.ref, 200);

  after(() => track(request, { kind, name, path, src, referrer }));

  return new Response(null, { status: 204 });
}
