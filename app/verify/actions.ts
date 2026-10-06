"use server";

import { findByHash } from "@/lib/signed-docs-store";

export type HashLookup =
  | { found: true; id: string; match: "signed" | "original" }
  | { found: false; error?: string };

/**
 * Which document a file is, from its SHA-256 alone — the browser hashes the
 * PDF, so the file itself never leaves the visitor's device.
 */
export async function lookupHashAction(sha256: string): Promise<HashLookup> {
  try {
    const hit = await findByHash(sha256.toLowerCase());
    return hit ? { found: true, id: hit.doc.id, match: hit.match } : { found: false };
  } catch (error) {
    console.error("[verify] hash lookup failed:", error);
    return { found: false, error: "unavailable" };
  }
}
