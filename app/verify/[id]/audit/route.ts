import { getSession } from "@/lib/auth";
import { normalizeDocId } from "@/lib/signed-docs";
import { docPaths, downloadUrl, getDoc, getFile } from "@/lib/signed-docs-store";

/**
 * A completed request's audit certificate. Yours only: it lists every
 * signer's email, IP and browser. They got their copy by email.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await getSession())) return new Response("Not found", { status: 404 });
  const id = normalizeDocId((await params).id);
  const doc = id ? await getDoc(id) : null;
  if (!doc?.auditSha256) return new Response("Not found", { status: 404 });

  const fileName = `${doc.fileName.replace(/\.pdf$/i, "")} (${doc.lang === "en" ? "audit" : "auditoría"}).pdf`;
  const url = await downloadUrl(docPaths.audit(doc.id), fileName);
  if (url) return Response.redirect(new URL(url, request.url), 302);
  const bytes = await getFile(docPaths.audit(doc.id));
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
