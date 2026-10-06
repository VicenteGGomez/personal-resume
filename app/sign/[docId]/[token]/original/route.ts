import { isVerified, recordSignerEvent, resolveLink } from "@/lib/envelopes";
import { docPaths, downloadUrl, getFile, saveSigner } from "@/lib/signed-docs-store";

/**
 * The PDF as sent, for a signer to read before signing: only through their
 * link, and only once they've confirmed their email in this browser.
 * `?download=1` saves it (and is noted in the audit trail); otherwise it's
 * the copy their page renders.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ docId: string; token: string }> },
) {
  const { docId, token } = await params;
  const found = await resolveLink(docId, token);
  if (!found || found.problem || !(await isVerified(found.signer))) {
    return new Response("Not found", { status: 404 });
  }

  const download = new URL(request.url).searchParams.get("download") === "1";
  const fileName = found.doc.fileName;
  if (download) {
    await recordSignerEvent(found.signer, "downloaded");
    await saveSigner(found.signer);
  }

  // Supabase serves the bytes itself: Vercel caps function responses at 4.5 MB.
  const url = await downloadUrl(docPaths.original(docId), download ? fileName : null);
  if (url) return Response.redirect(url, 302);
  const bytes = await getFile(docPaths.original(docId));
  if (!bytes) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
