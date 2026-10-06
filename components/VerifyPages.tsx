import Link from "next/link";
import { CopyCheck, LangSwitch, VerifyLookup } from "@/components/VerifyTools";
import { getSession } from "@/lib/auth";
import { getResumeData } from "@/lib/resume-store";
import {
  VERIFY_PATH,
  docStatus,
  normalizeDocId,
  publicSigner,
  type DocLang,
  type PublicSigner,
  type SignedDoc,
} from "@/lib/signed-docs";
import { getDoc, listSigners } from "@/lib/signed-docs-store";
import { formatWhen, verifyCopy } from "@/lib/verify-copy";

/**
 * The verifier's pages, rendered once per language: /verify (English) and
 * /verificar (Spanish) are thin routes around these.
 */

const CARD =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";
const MUTED = "text-neutral-500 dark:text-neutral-400";

/** The frame: plain, centred, with the way back to the site and EN/ES. */
export function VerifyFrame({ lang, children }: { lang: DocLang; children: React.ReactNode }) {
  const T = verifyCopy(lang);
  return (
    <div
      lang={lang}
      className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white"
    >
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-5">
        <Link href={`/${lang}`} className="shrink-0 text-sm font-semibold tracking-tight">
          Vicente G. Gómez
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={VERIFY_PATH[lang]}
            className={`text-right text-xs font-medium hover:text-current ${MUTED}`}
          >
            {T.anotherDoc}
          </Link>
          <LangSwitch lang={lang} />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}

/** Where the Doc ID printed on every signed page sends people. */
export function VerifyLanding({ lang }: { lang: DocLang }) {
  const T = verifyCopy(lang);
  return (
    <div className="pt-6">
      <h1 className="text-3xl font-semibold tracking-tight">{T.heading}</h1>
      <p className="mt-4 max-w-xl text-sm text-neutral-600 dark:text-neutral-300">{T.intro}</p>
      <div className={`${CARD} mt-6`}>
        <VerifyLookup lang={lang} />
      </div>
    </div>
  );
}

async function load(id: string | null): Promise<SignedDoc | null | "error"> {
  if (!id) return null;
  try {
    return await getDoc(id);
  } catch (error) {
    console.error("[verify] getDoc failed:", error);
    return "error";
  }
}

/** A document's record: valid or revoked, its details, the PDF, and the copy check. */
export async function VerifyDocument({ lang, rawId }: { lang: DocLang; rawId: string }) {
  const T = verifyCopy(lang);
  const [doc, session] = await Promise.all([load(normalizeDocId(rawId)), getSession()]);

  if (doc === null || doc === "error") {
    return (
      <section className={`${CARD} mt-6`}>
        <p className="text-3xl">{doc === "error" ? "⚠️" : "✗"}</p>
        <h1 className="mt-2 text-xl font-semibold">
          {doc === "error" ? T.unavailable : T.notFound}
        </h1>
        {doc === null && <p className={`mt-2 text-sm ${MUTED}`}>{T.notFoundBody}</p>}
      </section>
    );
  }

  const status = docStatus(doc);
  const completed = status === "completed";
  const revoked = completed && Boolean(doc.revokedAt);
  // Only the masked form of anyone's email reaches this page.
  const signers: PublicSigner[] = doc.status
    ? (await listSigners([doc.id])).map((s) => publicSigner(s))
    : [];
  const ownerName = doc.ownerSigns ? (await getResumeData()).shared.name : null;
  // You see your private documents as everyone sees public ones.
  const showPdf = completed && (doc.visibility === "public" || Boolean(session));

  const signerList = signers.length > 0 && (
    <ul className="space-y-1.5">
      {ownerName && (
        <li>
          {ownerName} <span className={`text-xs font-normal ${MUTED}`}>({T.sender})</span>
        </li>
      )}
      {signers.map((signer) => (
        <li key={signer.id}>
          {signer.name}{" "}
          <span className={`text-xs font-normal ${MUTED}`}>
            {signer.email} ·{" "}
            {signer.status === "signed"
              ? `${T.signerSigned} ${formatWhen(signer.signedAt!, lang)} · ${T.emailVerified}`
              : signer.status === "declined"
                ? T.signerDeclined
                : T.signerPending}
          </span>
        </li>
      ))}
    </ul>
  );
  const rows: [string, React.ReactNode][] = [
    [T.document, doc.title],
    ...(doc.note ? [[T.note, doc.note] as [string, React.ReactNode]] : []),
    signerList ? [T.signers, signerList] : [T.signedBy, doc.signerName],
    ...(completed ? [[T.signedAt, formatWhen(doc.signedAt, lang)] as [string, React.ReactNode]] : []),
    ...(completed
      ? [
          [
            T.timestamp,
            doc.timestamp
              ? `${formatWhen(doc.timestamp.time, lang)} — ${T.timestampBy} ${doc.timestamp.authority} (RFC 3161)`
              : T.noTimestamp,
          ] as [string, React.ReactNode],
        ]
      : []),
    [T.pages, doc.pages],
    [T.idLabel, <span key="id" className="break-all font-mono text-xs">{doc.id}</span>],
  ];

  return (
    <div className="space-y-4 pt-2">
      {!completed ? (
        <section
          className={`rounded-3xl p-6 ${
            status === "pending"
              ? "bg-amber-500/12 text-amber-800 dark:text-amber-300"
              : "bg-black/[0.05] dark:bg-white/10"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{T.title}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {status === "pending"
              ? `${T.pendingTitle} · ${signers.filter((s) => s.status === "signed").length}/${signers.length} ${T.progress}`
              : status === "declined"
                ? `✗ ${T.declinedTitle}`
                : status === "cancelled"
                  ? T.cancelledTitle
                  : T.expiredTitle}
          </h1>
          <p className="mt-1 text-sm">
            {status === "pending"
              ? T.pendingBody
              : status === "declined"
                ? T.declinedBody
                : status === "cancelled"
                  ? T.cancelledBody
                  : T.expiredBody}
          </p>
        </section>
      ) : (
        <section
          className={`rounded-3xl p-6 ${
            revoked
              ? "bg-red-500/10 text-red-700 dark:text-red-300"
              : "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{T.title}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {revoked ? `✗ ${T.revoked}` : `✓ ${T.valid}`}
          </h1>
          <p className="mt-1 text-sm">{revoked ? T.revokedBody : T.validBody}</p>
          {revoked && doc.revokedAt && (
            <p className="mt-2 text-sm">
              {T.revokedOn} {formatWhen(doc.revokedAt, lang)}
              {doc.revokedReason && (
                <>
                  <br />
                  {T.reason}: {doc.revokedReason}
                </>
              )}
            </p>
          )}
        </section>
      )}

      <section className={CARD}>
        <dl className="grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-[max-content_1fr] sm:gap-y-3">
          {rows.map(([label, value], i) => (
            <div key={label} className="contents">
              <dt className={`${MUTED} ${i ? "mt-3 sm:mt-0" : ""}`}>{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {!completed ? null : showPdf ? (
        <section className={`${CARD} space-y-4`}>
          {doc.visibility === "private" && (
            <p className="rounded-2xl bg-black/[0.04] px-4 py-2 text-xs text-neutral-500 dark:bg-white/10">
              {T.privateOwner}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <a
              href={`/verify/${doc.id}/pdf`}
              className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] dark:bg-white dark:text-black"
            >
              {T.download}
            </a>
            <a
              href={`/verify/${doc.id}/pdf?inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-2.5 text-sm font-semibold ring-1 ring-black/10 dark:ring-white/15"
            >
              {T.open} ↗
            </a>
          </div>
          <iframe
            src={`/verify/${doc.id}/pdf?inline=1#view=FitH`}
            title={doc.title}
            className="hidden h-[80vh] w-full rounded-2xl bg-white ring-1 ring-black/10 sm:block"
          />
        </section>
      ) : (
        <section className={CARD}>
          <h2 className="text-sm font-semibold">🔒 {T.private}</h2>
          <p className={`mt-1 text-sm ${MUTED}`}>{T.privateBody}</p>
        </section>
      )}

      {completed && (
        <section className={CARD}>
          <h2 className="text-sm font-semibold">{T.checkTitle}</h2>
          <p className={`mb-3 mt-1 text-sm ${MUTED}`}>{T.checkBody}</p>
          <CopyCheck
            lang={lang}
            signedSha256={doc.signedSha256}
            originalSha256={doc.originalSha256}
            auditSha256={doc.auditSha256}
          />
        </section>
      )}

      {completed && (
        <details className={`${CARD} text-sm`}>
          <summary className="cursor-pointer font-semibold">{T.technical}</summary>
          <dl className="mt-4 space-y-3">
            {(
              [
                [T.signedHash, doc.signedSha256],
                [T.originalHash, doc.originalSha256],
                ...(doc.auditSha256 ? [[T.auditHash, doc.auditSha256]] : []),
                ...(doc.certFingerprint ? [[T.certFingerprint, doc.certFingerprint]] : []),
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <dt className={MUTED}>{label}</dt>
                <dd className="break-all font-mono text-xs">{value}</dd>
              </div>
            ))}
          </dl>
          <p className={`mt-4 ${MUTED}`}>{T.adobeHelp}</p>
          {/* A file download from a route handler, not a page to navigate to. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/verify/certificate"
            className="mt-3 inline-block font-semibold underline underline-offset-2"
          >
            {T.certDownload}
          </a>
        </details>
      )}

      <p className="px-2 text-xs text-neutral-400">{T.legal}</p>
    </div>
  );
}
