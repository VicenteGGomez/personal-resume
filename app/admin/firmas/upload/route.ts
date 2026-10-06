import { getSession } from "@/lib/auth";
import { MAX_PDF_BYTES } from "@/lib/signed-docs";
import { docPaths, putFile } from "@/lib/signed-docs-store";
import { isSupabaseMode } from "@/lib/supabase";

/**
 * Local-dev stand-in for Supabase's one-time upload URL (see `uploadTarget`):
 * takes the PDF the browser PUTs before it is signed. In production the
 * browser uploads straight to the private bucket and this answers 404.
 */
export async function PUT(request: Request) {
  if (isSupabaseMode()) return new Response("Not found", { status: 404 });
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(key)) return new Response("Bad key", { status: 400 });
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_PDF_BYTES) {
    return new Response("Bad size", { status: 413 });
  }
  await putFile(docPaths.upload(key), bytes, "application/pdf");
  return new Response(null, { status: 204 });
}
