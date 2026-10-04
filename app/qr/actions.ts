"use server";

import { getSession } from "@/lib/auth";
import { parseExternalUrl, signGoUrl } from "@/lib/tracked-redirect";

export type SignLinkResult =
  | { ok: true; target: string; signature: string }
  | { ok: false; error: string };

/**
 * Sign a link for `/go`. Admin only: a signed link redirects anywhere from
 * this domain, so it is never minted for an anonymous visitor of `/qr`.
 */
export async function signLinkAction(input: string): Promise<SignLinkResult> {
  if (!(await getSession())) {
    return { ok: false, error: "Tu sesión expiró. Vuelve a iniciar sesión." };
  }
  const target = parseExternalUrl(input);
  if (!target) {
    return { ok: false, error: "Escribe un enlace válido, por ejemplo https://…" };
  }
  return { ok: true, target, signature: signGoUrl(target) };
}
