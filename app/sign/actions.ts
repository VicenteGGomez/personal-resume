"use server";

import {
  auditEvent,
  finalizeIfComplete,
  isVerified,
  notifyOwner,
  recordSignerEvent,
  resolveLink,
  sendCode,
  verifyCode,
} from "@/lib/envelopes";
import { docStatus } from "@/lib/signed-docs";
import {
  docPaths,
  getDoc,
  listSigners,
  putFile,
  saveDoc,
  saveSigner,
} from "@/lib/signed-docs-store";

/**
 * What a signer's page can do, each step checked against the secret in their
 * link — and, from the review onwards, against the code they confirmed by
 * email in this browser. Errors are codes; the page words them in the
 * document's language. Nothing here revalidates: that would re-render the
 * page under the signer and swap their "done" screen for the link's new state
 * (/admin/firmas is dynamic anyway).
 */

export type SignerError =
  | "link"
  | "closed"
  | "unverified"
  | "wait"
  | "limit"
  | "email"
  | "wrong"
  | "expired"
  | "locked"
  | "image"
  | "consent"
  | "reason"
  | "server";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: SignerError };

const MAX_SIGNATURE_BYTES = 1024 * 1024;
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** The link's signer, if it can still act; otherwise the reason it can't. */
async function open(docId: string, token: string) {
  const found = await resolveLink(docId, token);
  if (!found) return { error: "link" as const };
  if (found.problem) return { error: "closed" as const };
  return found;
}

/** Notes that the link was opened — once per visit, for the audit trail. */
export async function markOpenedAction(docId: string, token: string): Promise<void> {
  const found = await open(docId, token);
  if ("error" in found) return;
  const last = [...found.signer.events].reverse().find((e) => e.type === "opened");
  if (last && Date.now() - Date.parse(last.at) < 30 * 60 * 1000) return;
  await recordSignerEvent(found.signer, "opened");
  await saveSigner(found.signer);
}

export async function sendCodeAction(docId: string, token: string): Promise<Result> {
  const found = await open(docId, token);
  if ("error" in found) return { ok: false, error: found.error };
  const result = await sendCode(found.doc, found.signer);
  return result.ok ? { ok: true } : { ok: false, error: result.reason };
}

export async function verifyCodeAction(
  docId: string,
  token: string,
  code: string,
): Promise<Result> {
  const found = await open(docId, token);
  if ("error" in found) return { ok: false, error: found.error };
  const result = await verifyCode(found.signer, code);
  return result.ok ? { ok: true } : { ok: false, error: result.reason };
}

/** A signed-in signer's verified session, or why there isn't one. */
async function verified(docId: string, token: string) {
  const found = await open(docId, token);
  if ("error" in found) return found;
  if (!(await isVerified(found.signer))) return { error: "unverified" as const };
  return found;
}

export async function signAction(
  docId: string,
  token: string,
  input: { image: string; method: "drawn" | "typed"; consent: boolean },
): Promise<Result<{ completed: boolean }>> {
  const found = await verified(docId, token);
  if ("error" in found) return { ok: false, error: found.error };
  if (!input.consent) return { ok: false, error: "consent" };

  const image = Buffer.from(input.image.replace(/^data:image\/png;base64,/, ""), "base64");
  if (image.length === 0 || image.length > MAX_SIGNATURE_BYTES || !image.subarray(0, 8).equals(PNG_MAGIC)) {
    return { ok: false, error: "image" };
  }

  const { doc, signer } = found;
  try {
    await putFile(docPaths.signerSignature(doc.id, signer.id), image, "image/png");
    signer.status = "signed";
    signer.signedAt = new Date().toISOString();
    signer.signatureMethod = input.method === "typed" ? "typed" : "drawn";
    await recordSignerEvent(signer, "signed");
    await saveSigner(signer);
  } catch (error) {
    console.error("[sign] saving signature failed:", error);
    return { ok: false, error: "server" };
  }

  const others = await listSigners([doc.id]);
  const left = others.filter((s) => s.id !== signer.id && s.status !== "signed").length;
  await notifyOwner(doc, signer, left);

  let completed = false;
  if (left === 0) {
    try {
      completed = Boolean(await finalizeIfComplete(doc.id));
    } catch (error) {
      // Their signature is saved; the final PDF can be rebuilt from /admin/firmas.
      console.error("[sign] finalize failed:", error);
    }
  }
  return { ok: true, completed };
}

export async function declineAction(
  docId: string,
  token: string,
  reason: string,
): Promise<Result> {
  const found = await verified(docId, token);
  if ("error" in found) return { ok: false, error: found.error };
  const why = reason.trim().slice(0, 1000);
  if (!why) return { ok: false, error: "reason" };

  const { signer } = found;
  signer.status = "declined";
  signer.declinedAt = new Date().toISOString();
  signer.declineReason = why;
  await recordSignerEvent(signer, "declined");
  await saveSigner(signer);

  // One refusal ends the request for everyone.
  const doc = await getDoc(docId);
  if (doc && docStatus(doc) === "pending") {
    await saveDoc({
      ...doc,
      status: "declined",
      events: [...(doc.events ?? []), await auditEvent("declined")],
    });
  }
  if (doc) await notifyOwner(doc, signer, 0);
  return { ok: true };
}
