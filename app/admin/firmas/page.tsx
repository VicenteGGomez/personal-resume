import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import SigningStudio from "@/components/SigningStudio";
import { getSession } from "@/lib/auth";
import { getResumeData } from "@/lib/resume-store";
import { docPaths, getFile, listDocs } from "@/lib/signed-docs-store";
import { hasSigningIdentity } from "@/lib/signing-identity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Firmar documentos",
  robots: { index: false, follow: false },
};

/**
 * Sign a PDF: its ID stamped on every page, your signature and a QR wherever
 * you drag them, and a record at /verify/<ID> anyone can check it against.
 */
export default async function SigningPage() {
  const session = await getSession();
  if (!session) {
    return (
      <AdminLogin next="/admin/firmas" subtitle="Ingresa para firmar documentos." />
    );
  }

  const [docs, signature, { shared }] = await Promise.all([
    listDocs().catch((error) => {
      console.error("[firmas] listDocs failed:", error);
      return null;
    }),
    getFile(docPaths.signatureImage),
    getResumeData(),
  ]);

  return (
    <SigningStudio
      email={session.email}
      signerName={shared.name}
      initialDocs={docs}
      hasSignature={Boolean(signature)}
      // Production signs only with the certificate from the env vars; locally
      // a throwaway one stands in (see lib/signing-identity.ts).
      certMissing={process.env.NODE_ENV === "production" && !hasSigningIdentity()}
    />
  );
}
