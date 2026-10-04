import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import QrShortcut from "@/components/QrShortcut";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compartir",
  robots: { index: false, follow: false },
};

/**
 * Your sharing shortcut: pick what to share and get a tagged link and QR.
 * Open to anyone with the address, except "otro link", which signs a redirect
 * on this domain and so needs the admin session (`?login=1` asks for it).
 */
export default async function QrPage({
  searchParams,
}: {
  searchParams: Promise<{ login?: string | string[] }>;
}) {
  const [{ login }, session] = await Promise.all([searchParams, getSession()]);
  if (login === "1" && !session) {
    return (
      <AdminLogin
        next="/qr"
        subtitle="Ingresa para crear enlaces a cualquier sitio."
      />
    );
  }
  return <QrShortcut canSign={Boolean(session)} />;
}
