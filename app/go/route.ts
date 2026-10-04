import { trackedRedirect, verifyGoUrl } from "@/lib/tracked-redirect";

export const dynamic = "force-dynamic";

// `/go?u=<url>&s=<signature>&src=…` — any link made on the spot from /qr,
// counted under `/go/<host>`. Only follows URLs this server signed.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = params.get("u") ?? "";
  const signature = params.get("s") ?? "";

  let host = "";
  try {
    const url = new URL(target);
    if (url.protocol === "https:" || url.protocol === "http:") host = url.hostname;
  } catch {
    // Falls through to the refusal below.
  }
  if (!host || !verifyGoUrl(target, signature)) {
    return new Response("Este enlace no es válido.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  return trackedRedirect(request, `/go/${host.replace(/^www\./, "")}`, target);
}
