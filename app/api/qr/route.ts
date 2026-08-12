import QRCode from "qrcode";
import { SITE_ORIGIN } from "@/lib/share-links";

/**
 * QR images for the tagged sharing links (`/admin/share`) and for the public
 * "Share my site" dialog.
 *
 * Only encodes URLs that point at this site: a QR code carries the authority of
 * whoever printed it, so this endpoint must never mint one aiming somewhere
 * else.
 */

export const dynamic = "force-dynamic";

const MAX_SIZE = 1200;
const MIN_SIZE = 128;
const DEFAULT_SIZE = 512;

function allowedHosts(requestHost: string): Set<string> {
  return new Set(
    [requestHost, new URL(SITE_ORIGIN).host].filter(Boolean),
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = url.searchParams.get("u") ?? "";
  const png = url.searchParams.get("fmt") === "png";
  const size = Math.min(
    MAX_SIZE,
    Math.max(MIN_SIZE, Number(url.searchParams.get("size")) || DEFAULT_SIZE),
  );

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return new Response("Invalid URL", { status: 400 });
  }
  if (!allowedHosts(url.host).has(parsed.host)) {
    return new Response("Only this site's URLs can be encoded.", { status: 400 });
  }

  // A QR for a given URL never changes, so it can be cached hard.
  const headers = new Headers({
    "Cache-Control": "public, max-age=31536000, immutable",
  });

  try {
    if (png) {
      const buffer = await QRCode.toBuffer(parsed.toString(), {
        type: "png",
        margin: 1,
        width: size,
        errorCorrectionLevel: "M",
      });
      headers.set("Content-Type", "image/png");
      return new Response(new Uint8Array(buffer), { status: 200, headers });
    }

    const svg = await QRCode.toString(parsed.toString(), {
      type: "svg",
      margin: 1,
      errorCorrectionLevel: "M",
    });
    headers.set("Content-Type", "image/svg+xml");
    return new Response(svg, { status: 200, headers });
  } catch (error) {
    console.error("qr: generation failed", error);
    return new Response("Could not generate the QR code.", { status: 500 });
  }
}
