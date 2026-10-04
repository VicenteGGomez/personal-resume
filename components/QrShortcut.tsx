"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Link from "next/link";
import { signLinkAction } from "@/app/qr/actions";
import {
  DEFAULT_VCARD_FIELDS,
  VCARD_FIELDS,
  encodeVcardFields,
  qrTag,
  trackedUrl,
  type ShareLang,
  type VcardField,
} from "@/lib/qr-shortcuts";
import { qrImageUrl } from "@/lib/share-links";

/**
 * The `/qr` shortcut: what do you want to share? → a tagged link and its QR,
 * ready to show on screen, copy, send or save.
 */

type Choice =
  | "cv"
  | "linkedin"
  | "whatsapp"
  | "web"
  | "clases"
  | "vcard"
  | "custom";

const CHOICES: { id: Choice; emoji: string; label: string; hint: string }[] = [
  { id: "cv", emoji: "📄", label: "CV", hint: "El PDF" },
  { id: "linkedin", emoji: "💼", label: "LinkedIn", hint: "Tu perfil" },
  { id: "whatsapp", emoji: "💬", label: "WhatsApp", hint: "Un chat contigo" },
  { id: "web", emoji: "🌐", label: "Web CV", hint: "Este sitio" },
  { id: "clases", emoji: "🎓", label: "Web clases", hint: "vicentegomez.cl" },
  { id: "vcard", emoji: "👤", label: "Contacto", hint: "vCard" },
  { id: "custom", emoji: "🔗", label: "Otro link", hint: "Cualquier enlace" },
];

/** The choices whose destination depends on the ES/EN toggle. */
const LANG_AWARE = new Set<Choice>(["cv", "web", "vcard"]);

const LANG_KEY = "qr:lang";

const subscribeNever = () => () => {};

/** The language you shared in last time, `es` until you pick one. */
function readStoredLang(): ShareLang {
  try {
    return localStorage.getItem(LANG_KEY) === "en" ? "en" : "es";
  } catch {
    return "es";
  }
}

type Step =
  | { kind: "pick" }
  | { kind: "vcard" }
  | { kind: "custom" }
  | { kind: "result"; choice: Choice };

const CARD =
  "rounded-3xl bg-white p-6 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";
const INPUT =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm outline-none focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";
const PRIMARY =
  "rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-60 dark:bg-white dark:text-black";
const SECONDARY =
  "rounded-full px-4 py-2.5 text-sm font-medium ring-1 ring-black/10 transition hover:bg-black/[0.04] dark:ring-white/15 dark:hover:bg-white/[0.06]";

export default function QrShortcut({ canSign }: { canSign: boolean }) {
  const [step, setStep] = useState<Step>({ kind: "pick" });
  // Remembered across visits; a context is per occasion, so it never is.
  const storedLang = useSyncExternalStore(subscribeNever, readStoredLang, () => "es" as const);
  const [pickedLang, setPickedLang] = useState<ShareLang | null>(null);
  const lang = pickedLang ?? storedLang;
  const [context, setContext] = useState("");
  const [fields, setFields] = useState<VcardField[]>(DEFAULT_VCARD_FIELDS);
  const [custom, setCustom] = useState({ input: "", target: "", signature: "" });
  const [error, setError] = useState("");
  const [signing, startSigning] = useTransition();

  const pickLang = (next: ShareLang) => {
    setPickedLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // ignore
    }
  };

  const tag = qrTag(context);

  const urlFor = (choice: Choice): string => {
    switch (choice) {
      case "cv":
        return trackedUrl(lang === "en" ? "/cv" : "/cv-es", tag);
      case "linkedin":
        return trackedUrl("/linkedin", tag);
      case "whatsapp":
        return trackedUrl("/whatsapp", tag);
      case "web":
        return trackedUrl(`/${lang}`, tag);
      case "clases":
        return trackedUrl("/clases", tag);
      case "vcard":
        return trackedUrl("/vcard", tag, { f: encodeVcardFields(fields), lang });
      case "custom":
        return trackedUrl("/go", tag, { u: custom.target, s: custom.signature });
    }
  };

  const choose = (choice: Choice) => {
    setError("");
    if (choice === "vcard") setStep({ kind: "vcard" });
    else if (choice === "custom") setStep({ kind: "custom" });
    else setStep({ kind: "result", choice });
  };

  const sign = () => {
    setError("");
    startSigning(async () => {
      const result = await signLinkAction(custom.input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCustom((prev) => ({
        ...prev,
        target: result.target,
        signature: result.signature,
      }));
      setStep({ kind: "result", choice: "custom" });
    });
  };

  const back = () => {
    setError("");
    setStep({ kind: "pick" });
  };

  return (
    <main className="flex min-h-screen items-start justify-center bg-[#f5f5f7] px-4 py-10 text-[#1d1d1f] sm:items-center dark:bg-[#050505] dark:text-white">
      <div className={`${CARD} w-full max-w-md`} role="dialog" aria-labelledby="qr-title">
        {step.kind === "pick" && (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 id="qr-title" className="text-lg font-semibold tracking-tight">
                ¿Qué quieres compartir?
              </h1>
              <LangToggle lang={lang} onChange={pickLang} />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice.id)}
                  className={`flex flex-col items-start rounded-2xl px-4 py-3 text-left ring-1 ring-black/10 transition hover:bg-black/[0.04] active:scale-[0.98] dark:ring-white/15 dark:hover:bg-white/[0.06] ${
                    choice.id === "custom" ? "col-span-2" : ""
                  }`}
                >
                  <span className="text-xl" aria-hidden>
                    {choice.emoji}
                  </span>
                  <span className="mt-1 text-sm font-semibold">{choice.label}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {choice.hint}
                    {LANG_AWARE.has(choice.id) && ` · ${lang.toUpperCase()}`}
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-5 block text-xs font-medium text-neutral-500 dark:text-neutral-400" htmlFor="qr-context">
              Contexto (opcional)
            </label>
            <input
              id="qr-context"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              placeholder="feria-uc3m, reunión con…"
              className={`${INPUT} mt-1.5`}
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              Se etiqueta como <code>src={tag}</code>
            </p>
          </>
        )}

        {step.kind === "vcard" && (
          <>
            <StepHeader title="¿Qué incluye el contacto?" onBack={back} />
            <ul className="mt-4 divide-y divide-black/5 dark:divide-white/10">
              {VCARD_FIELDS.map((field) => {
                const on = fields.includes(field.key);
                return (
                  <li key={field.key}>
                    <label className="flex cursor-pointer items-center justify-between py-2.5 text-sm">
                      {field.label}
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          setFields((prev) =>
                            on
                              ? prev.filter((key) => key !== field.key)
                              : VCARD_FIELDS.map((f) => f.key).filter(
                                  (key) => key === field.key || prev.includes(key),
                                ),
                          )
                        }
                        className="size-5 accent-[#2a78d6]"
                      />
                    </label>
                  </li>
                );
              })}
            </ul>
            <button
              type="button"
              disabled={fields.length === 0}
              onClick={() => setStep({ kind: "result", choice: "vcard" })}
              className={`${PRIMARY} mt-5 w-full`}
            >
              Generar QR
            </button>
          </>
        )}

        {step.kind === "custom" && (
          <>
            <StepHeader title="Otro link" onBack={back} />
            {canSign ? (
              <form
                className="mt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  sign();
                }}
              >
                <input
                  value={custom.input}
                  onChange={(event) =>
                    setCustom({ input: event.target.value, target: "", signature: "" })
                  }
                  placeholder="https://…"
                  inputMode="url"
                  autoComplete="off"
                  autoFocus
                  className={INPUT}
                />
                <p className="mt-1.5 text-xs text-neutral-400">
                  Pasa por tu dominio para contarlo; no se guarda en ninguna lista.
                </p>
                <button
                  type="submit"
                  disabled={signing || !custom.input.trim()}
                  className={`${PRIMARY} mt-5 w-full`}
                >
                  {signing ? "Generando…" : "Generar QR"}
                </button>
              </form>
            ) : (
              <div className="mt-4 text-sm text-neutral-600 dark:text-neutral-300">
                <p>
                  Un enlace a otro sitio pasa por tu dominio, así que solo se puede
                  crear con tu sesión iniciada.
                </p>
                <Link href="/qr?login=1" className={`${PRIMARY} mt-5 inline-block`}>
                  Iniciar sesión
                </Link>
              </div>
            )}
          </>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {error}
          </p>
        )}

        {step.kind === "result" && (
          <Result
            choice={step.choice}
            url={urlFor(step.choice)}
            lang={LANG_AWARE.has(step.choice) ? lang : null}
            onBack={back}
          />
        )}
      </div>
    </main>
  );
}

function LangToggle({
  lang,
  onChange,
}: {
  lang: ShareLang;
  onChange: (lang: ShareLang) => void;
}) {
  return (
    <div className="flex rounded-full bg-black/[0.05] p-0.5 text-xs font-semibold dark:bg-white/10" role="group" aria-label="Idioma">
      {(["es", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={lang === option}
          onClick={() => onChange(option)}
          className={`rounded-full px-3 py-1 transition ${
            lang === option
              ? "bg-white shadow-sm dark:bg-white/20"
              : "text-neutral-500 dark:text-neutral-400"
          }`}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

function StepHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="-ml-2 rounded-full px-2 py-1 text-lg leading-none text-neutral-500 hover:bg-black/[0.05] dark:hover:bg-white/10"
      >
        ←
      </button>
      <h1 id="qr-title" className="text-lg font-semibold tracking-tight">
        {title}
      </h1>
    </div>
  );
}

function Result({
  choice,
  url,
  lang,
  onBack,
}: {
  choice: Choice;
  url: string;
  lang: ShareLang | null;
  onBack: () => void;
}) {
  const [copied, setCopied] = useState(false);
  // `navigator` only exists in the browser: false on the server, re-read on
  // the client after hydration.
  const canShare = useSyncExternalStore(
    subscribeNever,
    () => typeof navigator.share === "function",
    () => false,
  );
  const meta = CHOICES.find((c) => c.id === choice)!;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the address below is selectable.
    }
  };

  const share = async () => {
    try {
      await navigator.share({ url });
    } catch {
      // Dismissed, or the browser refused: nothing to do.
    }
  };

  return (
    <>
      <StepHeader
        title={`${meta.emoji} ${meta.label}${lang ? ` · ${lang.toUpperCase()}` : ""}`}
        onBack={onBack}
      />
      {/* A QR needs a light quiet zone to scan, so it stays white in dark mode. */}
      <div className="mx-auto mt-5 w-full max-w-[18rem] rounded-2xl bg-white p-3 ring-1 ring-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- an SVG from our own endpoint */}
        <img src={qrImageUrl(url)} alt={`Código QR: ${meta.label}`} className="block aspect-square w-full" />
      </div>
      <p className="mt-4 select-all break-all rounded-xl bg-black/[0.04] px-3 py-2 font-mono text-xs text-neutral-600 dark:bg-white/[0.06] dark:text-neutral-300">
        {url}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={`${PRIMARY} flex-1`}>
          {copied ? "Copiado ✓" : "Copiar enlace"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className={`${SECONDARY} flex-1`}>
            Compartir…
          </button>
        )}
        <a
          href={qrImageUrl(url, { format: "png", size: 1024 })}
          download={`qr-${choice}.png`}
          className={`${SECONDARY} flex-1 text-center`}
        >
          Descargar PNG
        </a>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full text-center text-sm text-neutral-500 hover:underline dark:text-neutral-400"
      >
        Compartir otra cosa
      </button>
    </>
  );
}
