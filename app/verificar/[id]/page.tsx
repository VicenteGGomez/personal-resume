import type { Metadata } from "next";
import { VerifyDocument } from "@/components/VerifyPages";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verificación de documento",
  // A document's record is for whoever holds its ID, not for search engines.
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <VerifyDocument lang="es" rawId={(await params).id} />;
}
