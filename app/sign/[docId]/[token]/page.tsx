import type { Metadata } from "next";
import { Dancing_Script } from "next/font/google";
import Link from "next/link";
import SignerFlow from "@/components/SignerFlow";
import { isVerified, resolveLink } from "@/lib/envelopes";
import { getResumeData } from "@/lib/resume-store";
import { SIGN_COPY } from "@/lib/sign-copy";
import { maskEmail, verifyUrl } from "@/lib/signed-docs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign · Firmar",
  robots: { index: false, follow: false },
  // The path holds the link's secret: never hand it on as a referrer.
  referrer: "no-referrer",
};

/** The handwriting a typed signature is drawn in. */
const hand = Dancing_Script({ subsets: ["latin"], weight: "600" });

const CARD =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";

function Frame({ lang, children }: { lang: "es" | "en"; children: React.ReactNode }) {
  return (
    <div
      lang={lang}
      className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white"
    >
      <header className="mx-auto max-w-3xl px-4 py-5">
        <Link href={`/${lang}`} className="text-sm font-semibold tracking-tight">
          Vicente G. Gómez
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">{children}</main>
    </div>
  );
}

/** Where a person you sent a document to confirms their email, reviews it and signs. */
export default async function SignPage({
  params,
}: {
  params: Promise<{ docId: string; token: string }>;
}) {
  const { docId, token } = await params;
  const found = await resolveLink(docId, token).catch(() => null);

  if (!found) {
    // No document to take the language from: say it in both.
    return (
      <Frame lang="en">
        <section className={`${CARD} mt-6`}>
          <h1 className="text-xl font-semibold">{SIGN_COPY.en.invalidTitle}</h1>
          <p className="mt-2 text-sm text-neutral-500">{SIGN_COPY.en.invalidBody}</p>
          <h2 lang="es" className="mt-5 text-base font-semibold">{SIGN_COPY.es.invalidTitle}</h2>
          <p lang="es" className="mt-1 text-sm text-neutral-500">{SIGN_COPY.es.invalidBody}</p>
        </section>
      </Frame>
    );
  }

  const { doc, signer, problem } = found;
  const T = SIGN_COPY[doc.lang];
  if (problem) {
    return (
      <Frame lang={doc.lang}>
        <section className={`${CARD} mt-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {doc.title}
          </p>
          <h1 className="mt-2 text-xl font-semibold">{T.closed[problem]}</h1>
          {problem === "completed" && (
            <a
              href={verifyUrl(doc.id, doc.lang)}
              className="mt-4 inline-block rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-black"
            >
              {T.viewVerification}
            </a>
          )}
        </section>
      </Frame>
    );
  }

  const { shared } = await getResumeData();
  return (
    <Frame lang={doc.lang}>
      <SignerFlow
        lang={doc.lang}
        docId={doc.id}
        token={token}
        title={doc.title}
        note={doc.note}
        pages={doc.pages}
        ownerName={shared.name}
        signerName={signer.name}
        maskedEmail={maskEmail(signer.email)}
        verified={await isVerified(signer)}
        boxes={(doc.layout?.placements ?? []).filter(
          (p) => p.kind === "signer" && p.signerId === signer.id,
        )}
        verifyHref={verifyUrl(doc.id, doc.lang)}
        handFont={hand.style.fontFamily}
        handClass={hand.className}
      />
    </Frame>
  );
}
