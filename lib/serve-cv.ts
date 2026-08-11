import "server-only";

/**
 * Stream a stored CV (PDF) through our own route so the public URL stays
 * `/cv` (or `/cv-es`) instead of redirecting to the storage URL. Handles both
 * absolute blob URLs (production) and relative paths (repo-static / local dev).
 */
export async function serveCv(
  request: Request,
  target: string,
  downloadName: string,
): Promise<Response> {
  if (!target) {
    return new Response("CV no disponible.", { status: 404 });
  }

  // Resolve relative targets against the current origin; absolute URLs pass
  // through unchanged.
  const absolute = new URL(target, request.url);
  const upstream = await fetch(absolute, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("CV no disponible.", { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": "application/pdf",
    // `inline` opens it in the browser; the filename is used when saved.
    "Content-Disposition": `inline; filename="${downloadName}"`,
    "Cache-Control": "public, max-age=0, must-revalidate",
  });
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);

  return new Response(upstream.body, { status: 200, headers });
}
