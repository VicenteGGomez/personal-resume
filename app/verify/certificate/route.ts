import { getSigningIdentity } from "@/lib/signing-identity";

/**
 * The public certificate every PDF from /admin/firmas is signed with. Adding
 * it to Adobe's trusted certificates turns "identity unknown" into a named,
 * valid signature.
 */
export async function GET() {
  try {
    const { certPem } = await getSigningIdentity();
    return new Response(certPem, {
      headers: {
        "Content-Type": "application/x-pem-file",
        "Content-Disposition": 'attachment; filename="vicente-gomez-signing-certificate.pem"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not available", { status: 404 });
  }
}
