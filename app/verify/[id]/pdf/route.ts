import { getSession } from "@/lib/auth";
import { normalizeDocId } from "@/lib/signed-docs";
import { docPaths, downloadUrl, getDoc, getFile } from "@/lib/signed-docs-store";

/**
 * The signed PDF: for anyone when the document is public, otherwise only for
 * you. `?original=1` (yours only) is the file as uploaded, before stamping.
 * `?inline=1` opens it in the browser's viewer instead of downloading.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = normalizeDocId((await params).id);
  const doc = id ? await getDoc(id) : null;
  if (!doc) return new Response("Not found", { status: 404 });

  const query = new URL(request.url).searchParams;
  const isOwner = Boolean(await getSession());
  const original = query.get("original") === "1";
  if ((original || doc.visibility !== "public") && !isOwner) {
    return new Response("Not found", { status: 404 });
  }

  const objectPath = original ? docPaths.original(doc.id) : docPaths.signed(doc.id);
  const base = doc.fileName.replace(/\.pdf$/i, "");
  const fileName = original
    ? `${base}.pdf`
    : `${base} (${doc.lang === "en" ? "signed" : "firmado"}).pdf`;
  const inline = query.get("inline") === "1";

  // Supabase serves the bytes itself: Vercel caps function responses at 4.5 MB.
  const url = await downloadUrl(objectPath, inline ? null : fileName);
  if (url) return Response.redirect(url, 302);
  const bytes = await getFile(objectPath);
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
