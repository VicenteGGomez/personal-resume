"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { lookupHashAction } from "@/app/verify/actions";
import { VERIFY_PATH, normalizeDocId, type DocLang } from "@/lib/signed-docs";
import { sha256OfFile, verifyCopy, type VerifyCopy } from "@/lib/verify-copy";

/**
 * The interactive half of /verify and /verificar: find a document by its ID or
 * by the file itself, check a copy against a document's record, and switch
 * language. Files are hashed here, in the browser — only the hash ever reaches
 * the server.
 */

const INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 font-mono text-sm uppercase outline-none placeholder:normal-case placeholder:font-sans focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";
const PRIMARY =
  "shrink-0 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white dark:text-black";
const SECONDARY =
  "inline-block cursor-pointer rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition hover:bg-black/[0.04] dark:ring-white/15 dark:hover:bg-white/[0.06]";

type Outcome = "signed" | "original" | "audit" | "none" | "error";

const TONE: Record<Outcome, string> = {
  signed: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  original: "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  audit: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  none: "bg-red-500/10 text-red-600 dark:text-red-400",
  error: "bg-red-500/10 text-red-600 dark:text-red-400",
};

function outcomeText(outcome: Outcome, T: VerifyCopy): string {
  return {
    signed: `✓ ${T.matchSigned}`,
    original: T.matchOriginal,
    audit: `✓ ${T.matchAudit}`,
    none: `✗ ${T.noMatch}`,
    error: T.unavailable,
  }[outcome];
}

/** The same page in the other language: /verify/<ID> ↔ /verificar/<ID>. */
export function LangSwitch({ lang }: { lang: DocLang }) {
  const pathname = usePathname() ?? VERIFY_PATH[lang];
  const other: DocLang = lang === "en" ? "es" : "en";
  const href = VERIFY_PATH[other] + pathname.slice(VERIFY_PATH[lang].length);
  return (
    <Link
      href={href}
      hrefLang={other}
      title={verifyCopy(lang).switchLang}
      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
    >
      {other.toUpperCase()}
    </Link>
  );
}

function PdfPicker({
  T,
  busy,
  onPick,
}: {
  T: VerifyCopy;
  busy: boolean;
  onPick: (file: File) => void;
}) {
  return (
    <label className={SECONDARY}>
      {busy ? T.checking : T.checkPick}
      <input
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}

function Result({
  outcome,
  text,
  children,
}: {
  outcome: Outcome;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`mt-3 rounded-2xl px-4 py-3 text-sm font-medium ${TONE[outcome]}`}>
      <p>{text}</p>
      {children}
    </div>
  );
}

/** The landing page: type the ID from the page margin, or pick the PDF itself. */
export function VerifyLookup({ lang }: { lang: DocLang }) {
  const T = verifyCopy(lang);
  const router = useRouter();
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ kind: Outcome; id?: string } | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const id = normalizeDocId(input);
    setInvalid(!id);
    if (id) router.push(`${VERIFY_PATH[lang]}/${id}`);
  }

  async function checkFile(file: File) {
    setBusy(true);
    setOutcome(null);
    try {
      const result = await lookupHashAction(await sha256OfFile(file));
      // Said here rather than carried to the document's page in its URL, where
      // anyone could type "your copy matches" into a link.
      setOutcome(
        result.found
          ? { kind: result.match, id: result.id }
          : { kind: result.error ? "error" : "none" },
      );
    } catch {
      setOutcome({ kind: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="doc-id" className="block text-sm font-medium">
          {T.idLabel}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="doc-id"
            className={INPUT}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={PRIMARY}>
            {T.verifyButton}
          </button>
        </div>
        {invalid && <p className="text-sm text-red-500">{T.idInvalid}</p>}
      </form>

      <div className="border-t border-black/5 pt-6 dark:border-white/10">
        <p className="text-sm font-medium">{T.noId}</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{T.noIdBody}</p>
        <div className="mt-3">
          <PdfPicker T={T} busy={busy} onPick={checkFile} />
        </div>
        {outcome && (
          <Result
            outcome={outcome.kind}
            text={outcome.kind === "none" ? T.lookupNone : outcomeText(outcome.kind, T)}
          >
            {outcome.id && (
              <Link
                href={`${VERIFY_PATH[lang]}/${outcome.id}`}
                className="mt-2 inline-block font-semibold underline underline-offset-2"
              >
                {T.seeRecord}
              </Link>
            )}
          </Result>
        )}
      </div>
    </div>
  );
}

/** On a document's page: does the PDF I was given match this record? */
export function CopyCheck({
  lang,
  signedSha256,
  originalSha256,
  auditSha256,
}: {
  lang: DocLang;
  signedSha256: string;
  originalSha256: string;
  auditSha256?: string;
}) {
  const T = verifyCopy(lang);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function check(file: File) {
    setBusy(true);
    setOutcome(null);
    try {
      const hash = await sha256OfFile(file);
      setOutcome(
        hash === signedSha256
          ? "signed"
          : hash === originalSha256
            ? "original"
            : hash === auditSha256
              ? "audit"
              : "none",
      );
    } catch {
      setOutcome("error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PdfPicker T={T} busy={busy} onPick={check} />
      {outcome && <Result outcome={outcome} text={outcomeText(outcome, T)} />}
    </div>
  );
}
