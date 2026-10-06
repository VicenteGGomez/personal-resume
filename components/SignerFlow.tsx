"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  declineAction,
  markOpenedAction,
  sendCodeAction,
  signAction,
  verifyCodeAction,
  type SignerError,
} from "@/app/sign/actions";
import { renderPdf, type PageImage } from "@/lib/pdf-render";
import { SIGN_COPY } from "@/lib/sign-copy";
import type { DocLang, Placement } from "@/lib/signed-docs";

/**
 * A signer's page, step by step: confirm their email with a code, review the
 * document (their boxes highlighted), then draw or type a signature and sign —
 * or decline with a reason.
 */

const CARD =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";
const INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";
const PRIMARY =
  "rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50 dark:bg-white dark:text-black";
const SECONDARY =
  "rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition hover:bg-black/[0.04] disabled:opacity-50 dark:ring-white/15 dark:hover:bg-white/[0.06]";
const INK = "#0f1a3a";

type Step = "verify" | "review" | "signed" | "declined";

/** The drawn part of a canvas, cropped with a little margin, as a PNG data URL. */
function trimmedPng(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d")!;
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let top = height, left = width, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 10) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right < 0) return null;
  const pad = 8;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(width - 1, right + pad);
  bottom = Math.min(height - 1, bottom + pad);
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")!.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return out.toDataURL("image/png");
}

/** A box to sign in with a finger, pen or mouse. */
function DrawPad({ onChange, clearLabel }: { onChange: (png: string | null) => void; clearLabel: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = INK;
  }, []);

  const point = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-44 w-full touch-none rounded-2xl bg-white ring-1 ring-black/10 dark:ring-white/20"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          last.current = point(e);
          const ctx = canvasRef.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = INK;
          ctx.fill();
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const p = point(e);
          const ctx = canvasRef.current!.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          // A curve through the midpoint keeps fast strokes from looking jagged.
          const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 };
          ctx.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
          onChange(trimmedPng(canvasRef.current!));
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
      <button
        type="button"
        className="mt-2 text-xs font-semibold text-neutral-500 underline underline-offset-2"
        onClick={() => {
          const canvas = canvasRef.current!;
          canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
          onChange(null);
        }}
      >
        {clearLabel}
      </button>
    </div>
  );
}

/** A typed name, drawn in a handwriting face. */
async function typedPng(name: string, fontFamily: string): Promise<string | null> {
  if (!name.trim()) return null;
  await document.fonts.load(`64px ${fontFamily}`);
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 220;
  const ctx = canvas.getContext("2d")!;
  ctx.font = `64px ${fontFamily}`;
  ctx.fillStyle = INK;
  ctx.textBaseline = "middle";
  ctx.fillText(name.trim(), 20, 110, 1160);
  return trimmedPng(canvas);
}

export default function SignerFlow({
  lang,
  docId,
  token,
  title,
  note,
  pages: pageCount,
  ownerName,
  signerName,
  maskedEmail,
  verified,
  boxes,
  verifyHref,
  handFont,
  handClass,
}: {
  lang: DocLang;
  docId: string;
  token: string;
  title: string;
  note: string;
  pages: number;
  ownerName: string;
  signerName: string;
  maskedEmail: string;
  verified: boolean;
  boxes: Placement[];
  verifyHref: string;
  handFont: string;
  handClass: string;
}) {
  const T = SIGN_COPY[lang];
  const [step, setStep] = useState<Step>(verified ? "review" : "verify");
  const [error, setError] = useState<SignerError | null>(null);
  const [pending, startTransition] = useTransition();
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [pages, setPages] = useState<PageImage[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [drawn, setDrawn] = useState<string | null>(null);
  const [typed, setTyped] = useState(signerName);
  const [consent, setConsent] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [completed, setCompleted] = useState(false);

  const originalUrl = `/sign/${docId}/${token}/original`;

  useEffect(() => {
    void markOpenedAction(docId, token);
  }, [docId, token]);

  useEffect(() => {
    if (step !== "review" || pages || loadFailed) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(originalUrl);
        if (!response.ok) throw new Error(String(response.status));
        const rendered = await renderPdf(await response.arrayBuffer());
        if (!cancelled) setPages(rendered);
      } catch (e) {
        console.error(e);
        if (!cancelled) setLoadFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, pages, loadFailed, originalUrl]);

  function fail(result: { ok: false; error: SignerError }) {
    setError(result.error);
    if (result.error === "unverified") setStep("verify");
  }

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const result = await sendCodeAction(docId, token);
      if (result.ok) setCodeSent(true);
      else fail(result);
    });
  }

  function confirmCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await verifyCodeAction(docId, token, code);
      if (result.ok) setStep("review");
      else fail(result);
    });
  }

  function sign() {
    setError(null);
    startTransition(async () => {
      const image = mode === "draw" ? drawn : await typedPng(typed, handFont);
      if (!image) {
        setError("image");
        return;
      }
      const result = await signAction(docId, token, {
        image,
        method: mode === "draw" ? "drawn" : "typed",
        consent,
      });
      if (!result.ok) return fail(result);
      setCompleted(result.completed);
      setStep("signed");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function decline() {
    setError(null);
    startTransition(async () => {
      const result = await declineAction(docId, token, reason);
      if (!result.ok) return fail(result);
      setStep("declined");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  const header = (
    <section className={CARD}>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{T.hello(signerName)}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        {T.sentBy(ownerName)} · {T.pages(pageCount)}
      </p>
      {note && <p className="mt-2 text-sm italic text-neutral-500">{note}</p>}
    </section>
  );

  const errorLine = error && (
    <p className="rounded-2xl bg-red-500/10 px-4 py-2.5 text-sm text-red-600 dark:text-red-400">
      {T.errors[error]}
    </p>
  );

  if (step === "signed" || step === "declined") {
    const signed = step === "signed";
    return (
      <div className="space-y-4 pt-2">
        <section
          className={`rounded-3xl p-6 ${
            signed
              ? "bg-emerald-500/12 text-emerald-800 dark:text-emerald-300"
              : "bg-black/[0.05] dark:bg-white/10"
          }`}
        >
          <h1 className="text-2xl font-semibold tracking-tight">
            {signed ? `✓ ${T.signedTitle}` : T.declinedTitle}
          </h1>
          <p className="mt-2 text-sm">
            {signed ? (completed ? T.completedBody : T.signedBody) : T.declinedBody}
          </p>
          {signed && completed && (
            <a href={verifyHref} className={`${PRIMARY} mt-4 inline-block`}>
              {T.viewVerification}
            </a>
          )}
        </section>
      </div>
    );
  }

  if (step === "verify") {
    return (
      <div className="space-y-4 pt-2">
        {header}
        <section className={CARD}>
          <h2 className="text-base font-semibold">{T.verifyTitle}</h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {codeSent ? T.codeSent(maskedEmail) : T.verifyBody(maskedEmail)}
          </p>
          {!codeSent ? (
            <button type="button" className={`${PRIMARY} mt-4`} onClick={sendCode} disabled={pending}>
              {pending ? T.sending : T.sendCode}
            </button>
          ) : (
            <form onSubmit={confirmCode} className="mt-4 space-y-3">
              <label className="block text-sm font-medium" htmlFor="code">
                {T.codeLabel}
              </label>
              <input
                id="code"
                className={`${INPUT} max-w-[12rem] text-center font-mono text-xl tracking-[0.4em]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              <div className="flex flex-wrap gap-2">
                <button type="submit" className={PRIMARY} disabled={pending || code.length !== 6}>
                  {pending ? T.verifying : T.verify}
                </button>
                <button type="button" className={SECONDARY} onClick={sendCode} disabled={pending}>
                  {T.resend}
                </button>
              </div>
            </form>
          )}
          {errorLine && <div className="mt-3">{errorLine}</div>}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {header}

      <section className={CARD}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">{T.reviewTitle}</h2>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{T.reviewBody}</p>
          </div>
          <a href={`${originalUrl}?download=1`} className={SECONDARY}>
            {T.download}
          </a>
        </div>
        <div className="mt-4 space-y-4">
          {loadFailed && <p className="text-sm text-amber-600">{T.loadError}</p>}
          {!pages && !loadFailed && (
            <div className="h-64 animate-pulse rounded-2xl bg-black/[0.04] dark:bg-white/[0.06]" />
          )}
          {pages?.map((page, index) => (
            <div
              key={index}
              className="relative mx-auto w-full overflow-hidden bg-white shadow-md ring-1 ring-black/10 [container-type:inline-size]"
              style={{ aspectRatio: `${page.width} / ${page.height}`, maxWidth: 720 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.url} alt="" className="absolute inset-0 h-full w-full" />
              {boxes
                .filter((box) => box.page === index)
                .map((box, i) => (
                  <span
                    key={i}
                    className="absolute flex items-center justify-center rounded-sm bg-amber-300/30 font-semibold text-amber-800 outline-2 outline-dashed outline-amber-500"
                    style={{
                      left: `${box.x * 100}%`,
                      top: `${box.y * 100}%`,
                      width: `${box.w * 100}%`,
                      height: `${box.h * 100}%`,
                      fontSize: `${(9 / page.width) * 100}cqw`,
                    }}
                  >
                    {T.yourSignatureHere}
                  </span>
                ))}
            </div>
          ))}
        </div>
      </section>

      <section className={CARD}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">{T.signTitle}</h2>
          <div className="inline-flex rounded-full bg-black/[0.05] p-0.5 text-xs dark:bg-white/10">
            {(["draw", "type"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-full px-3 py-1.5 font-semibold transition ${
                  mode === m ? "bg-white shadow-sm dark:bg-white/20" : "text-neutral-500"
                }`}
              >
                {m === "draw" ? T.draw : T.type}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          {mode === "draw" ? (
            <>
              <p className="mb-2 text-xs text-neutral-500">{T.drawHint}</p>
              <DrawPad onChange={setDrawn} clearLabel={T.clear} />
            </>
          ) : (
            <>
              <label className="block text-xs font-medium" htmlFor="typed">
                {T.typeLabel}
              </label>
              <input
                id="typed"
                className={`${INPUT} mt-1`}
                value={typed}
                maxLength={80}
                onChange={(e) => setTyped(e.target.value)}
              />
              <div
                className={`${handClass} mt-3 flex h-28 items-center overflow-hidden rounded-2xl bg-white px-5 text-5xl ring-1 ring-black/10`}
                style={{ color: INK }}
              >
                {typed}
              </div>
            </>
          )}
        </div>

        <label className="mt-5 flex items-start gap-2.5 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>{T.consent}</span>
        </label>

        {errorLine && <div className="mt-4">{errorLine}</div>}

        {declining ? (
          <div className="mt-5 space-y-2 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold">{T.declineTitle}</p>
            <textarea
              className={`${INPUT} min-h-24`}
              value={reason}
              maxLength={1000}
              placeholder={T.declinePlaceholder}
              onChange={(e) => setReason(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                disabled={pending || !reason.trim()}
                onClick={decline}
              >
                {T.declineConfirm}
              </button>
              <button type="button" className={SECONDARY} onClick={() => setDeclining(false)}>
                {T.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="text-sm font-semibold text-neutral-500 underline underline-offset-2"
              onClick={() => setDeclining(true)}
            >
              {T.decline}
            </button>
            <button
              type="button"
              className={PRIMARY}
              onClick={sign}
              disabled={pending || !consent || (mode === "draw" ? !drawn : !typed.trim())}
            >
              {pending ? T.signing : T.sign}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
