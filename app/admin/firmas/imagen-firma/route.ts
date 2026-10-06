import { getSession } from "@/lib/auth";
import { docPaths, getFile } from "@/lib/signed-docs-store";

/** Your saved signature image, for the placement editor. Admin only. */
export async function GET() {
  if (!(await getSession())) return new Response("Unauthorized", { status: 401 });
  const image = await getFile(docPaths.signatureImage);
  if (!image) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(image), {
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  });
}
