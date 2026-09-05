"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lang, ResumeData } from "@/lib/resume-content";
import {
  ALL_BLOCKS,
  MARKDOWN_BLOCKS,
  type MarkdownBlock,
  type MarkdownTarget,
  headingWarnings,
  resumeToMarkdown,
} from "@/lib/resume-markdown";
import {
  parseResumeMarkdown,
  type ParsedDocument,
} from "@/lib/resume-markdown-parse";
import {
  type ImportGroup,
  type ImportPlan,
  defaultSelection,
  planImport,
} from "@/lib/resume-import";
import { CV_LENGTHS, type CvLength, buildCvLatexPrompt } from "@/lib/cv-latex";
import { DEFAULT_CV_LATEX } from "@/lib/cv-latex-template";

/**
 * The **IA** window: everything the résumé has to do with an AI assistant, in
 * one place.
 *
 *   - *Copiar para la IA* builds the text you paste into one — your whole
 *     profile, cut down to the blocks that matter, either as context to edit or
 *     wrapped in a request for a CV in LaTeX.
 *   - *Subir / actualizar web* takes the rewritten document back, and hands it
 *     to {@link ImportReview}, which shows every change before/after with a tick
 *     box and publishes the ones you keep.
 *   - *CV en LaTeX* is where the finished `.tex` lands: download it, or save it
 *     as the shape the next CV is asked to follow.
 *
 * The reading, diffing and writing all live in `lib/` — this file is the panel
 * around them (`resume-markdown.ts`, `resume-markdown-parse.ts`,
 * `resume-import.ts`, `cv-latex.ts`).
 */

/* -------------------------------------------------------------------------- */
/* Shared chrome                                                              */
/* -------------------------------------------------------------------------- */

// The admin panel's button and field vocabulary, as in `TranslationSync.tsx`.
const primaryButton =
  "rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50 dark:bg-white dark:text-black";
const ghostButton =
  "rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10";
const fieldBox =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

/** Copy to the clipboard, falling back to a hidden textarea where it is absent. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } finally {
      document.body.removeChild(ta);
    }
  }
}

/** Hand the browser a file to save, without a round trip to the server. */
function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const LANG_NAME: Record<Lang, string> = { en: "inglés", es: "español" };

/** "12 mil caracteres · unas 3 mil palabras" — enough to feel the size. */
function sizeOf(text: string): string {
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const round = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")} mil` : String(n);
  return `${round(chars)} caracteres · ${round(words)} palabras`;
}

/** A small on/off pill — the block switches and the CV's extra options. */
function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`flex w-full items-start gap-2.5 rounded-xl border px-3 py-2 text-left transition ${
        on
          ? "border-black/15 bg-black/[0.04] dark:border-white/25 dark:bg-white/[0.08]"
          : "border-black/10 opacity-55 hover:opacity-80 dark:border-white/10"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          on
            ? "bg-black text-white dark:bg-white dark:text-black"
            : "border border-black/20 dark:border-white/25"
        }`}
      >
        {on ? "✓" : ""}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium leading-tight">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-xs leading-snug text-neutral-500 dark:text-neutral-400">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

/** A row of mutually exclusive choices. */
function Choice<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: Array<{ key: T; label: string; hint?: string; disabled?: boolean }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          disabled={o.disabled}
          onClick={() => onChange(o.key)}
          title={o.hint}
          className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition disabled:opacity-35 ${
            value === o.key
              ? "border-transparent bg-black text-white dark:bg-white dark:text-black"
              : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A tab: everything scrolls except the row of actions at the bottom. */
function TabBody({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="grid gap-6">{children}</div>
      </div>
      <div className="shrink-0 border-t border-black/5 px-5 py-3 dark:border-white/10">
        {footer}
      </div>
    </>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-2.5">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* The window                                                                 */
/* -------------------------------------------------------------------------- */

type Tab = "copy" | "upload" | "cv";
type Purpose = "profile" | CvLength;

/** A pasted document, read and diffed, waiting to be reviewed. */
export interface PastedDocument {
  lang: Lang;
  doc: ParsedDocument;
  plan: ImportPlan;
}

export function AiDialog({
  data,
  busy = false,
  onClose,
  onPublish,
  onLatexChange,
}: {
  data: ResumeData;
  /** A publish is in flight. */
  busy?: boolean;
  onClose: () => void;
  /** Write the ticked groups of a reviewed paste. */
  onPublish: (pasted: PastedDocument, selected: Set<string>) => void;
  /** Save the LaTeX box as the CV's shape. Marks the editor unsaved. */
  onLatexChange: (latex: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("copy");
  /**
   * The review of a pasted document. It sits **on top of** this window rather
   * than replacing it, so backing out of it leaves the paste, the tab and every
   * switch exactly where they were.
   */
  const [review, setReview] = useState<PastedDocument | null>(null);
  // Escape closes the topmost thing only: with a review open it is the
  // review's own handler that answers, and this window stays put.
  useEscape(() => {
    if (!review) onClose();
  });

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="IA"
        className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      >
        <div className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl sm:h-[min(90vh,900px)] sm:rounded-3xl dark:bg-neutral-900">
          <div className="shrink-0 border-b border-black/5 px-5 pt-4 dark:border-white/10">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold tracking-tight">IA</h2>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Pásale tu perfil a una IA, pídele un CV, y trae los cambios de
                  vuelta.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full px-2 py-1 text-sm text-neutral-400 transition hover:bg-black/5 dark:hover:bg-white/10"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex gap-1 overflow-x-auto">
              {(
                [
                  ["copy", "Copiar para la IA"],
                  ["upload", "Subir / actualizar web"],
                  ["cv", "CV en LaTeX"],
                ] as Array<[Tab, string]>
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`shrink-0 rounded-t-xl px-3.5 py-2 text-sm font-medium transition ${
                    tab === key
                      ? "bg-black/[0.05] font-semibold dark:bg-white/[0.08]"
                      : "text-neutral-500 hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            {tab === "copy" && <CopyTab data={data} />}
            {tab === "upload" && <UploadTab data={data} onReview={setReview} />}
            {tab === "cv" && <CvTab data={data} onLatexChange={onLatexChange} />}
          </div>
        </div>
      </div>

      {review && (
        <ImportReview
          lang={review.lang}
          plan={review.plan}
          busy={busy}
          onApply={(selected) => onPublish(review, selected)}
          onClose={() => setReview(null)}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 1 — what to paste into the AI                                          */
/* -------------------------------------------------------------------------- */

function CopyTab({ data }: { data: ResumeData }) {
  const [purpose, setPurpose] = useState<Purpose>("profile");
  const [target, setTarget] = useState<MarkdownTarget>("en");
  const [blocks, setBlocks] = useState<Set<MarkdownBlock>>(new Set(ALL_BLOCKS));
  const [linkToSite, setLinkToSite] = useState(true);
  const [crossSections, setCrossSections] = useState(false);
  const [audience, setAudience] = useState("");
  const [copied, setCopied] = useState(false);

  const isCv = purpose !== "profile";
  // A CV is written in one language, so "ambas" only makes sense as context.
  const effectiveTarget: MarkdownTarget = isCv && target === "both" ? "en" : target;

  const text = useMemo(() => {
    const profile = resumeToMarkdown(data, effectiveTarget, {
      blocks,
      contract: !isCv,
    });
    if (!isCv) return profile;
    return buildCvLatexPrompt(profile, data, {
      length: purpose,
      linkToSite,
      crossSections,
      audience,
    });
  }, [data, effectiveTarget, blocks, isCv, purpose, linkToSite, crossSections, audience]);

  const warnings = useMemo(
    () => headingWarnings(data, effectiveTarget),
    [data, effectiveTarget],
  );

  const toggle = (key: MarkdownBlock) =>
    setBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  async function copy() {
    await copyText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <TabBody
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">{sizeOf(text)}</p>
          <button type="button" onClick={copy} className={primaryButton}>
            {copied ? "Copiado ✓" : "Copiar"}
          </button>
        </div>
      }
    >
      <Section
        title="¿Qué le vas a pedir?"
        hint="En los tres casos el texto copiado le pide a la IA que primero proponga y pregunte, antes de escribir nada."
      >
        <Choice<Purpose>
          value={purpose}
          onChange={setPurpose}
          options={[
            { key: "profile", label: "Editar mi perfil" },
            ...CV_LENGTHS.map((l) => ({ key: l.key, label: l.label, hint: l.hint })),
          ]}
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {purpose === "profile"
            ? "Tu perfil completo, con las reglas para devolverlo y volver a subirlo aquí."
            : CV_LENGTHS.find((l) => l.key === purpose)?.hint}
        </p>
      </Section>

      <Section
        title={isCv ? "Idioma del CV" : "Versión"}
        hint={
          isCv
            ? "El perfil viaja en ese mismo idioma."
            : "«Ambas» sirve para leer; para volver a subir, un idioma a la vez."
        }
      >
        <Choice<MarkdownTarget>
          value={effectiveTarget}
          onChange={setTarget}
          options={[
            { key: "en", label: "Inglés" },
            { key: "es", label: "Español" },
            {
              key: "both",
              label: "Ambas",
              disabled: isCv,
              hint: isCv ? "Un CV se escribe en un idioma" : undefined,
            },
          ]}
        />
      </Section>

      {isCv && (
        <>
          <Section
            title="¿Va dirigido a alguien en particular?"
            hint="Empresa, cargo, o lo que diga el aviso. Si lo dejas vacío, sale un CV genérico."
          >
            <textarea
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              rows={3}
              placeholder="Analyst, Global Markets — J.P. Morgan Madrid. Piden SQL y Python, y experiencia en riesgo."
              aria-label="Empresa o cargo al que va dirigido"
              className={`${fieldBox} resize-y leading-6`}
            />
          </Section>

          {purpose === "long" && (
            <Section
              title="Referencias cruzadas"
              hint="Solo en la versión extensa, que tiene espacio para ellas."
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Toggle
                  on={linkToSite}
                  onChange={setLinkToSite}
                  label="Enlazar a mi web"
                  hint="Un proyecto o publicación con página propia queda enlazado desde el CV"
                />
                <Toggle
                  on={crossSections}
                  onChange={setCrossSections}
                  label="Conectar secciones entre sí"
                  hint="Un premio menciona la carrera donde lo ganaste, un proyecto el cargo del que salió"
                />
              </div>
            </Section>
          )}
        </>
      )}

      <Section
        title="Qué incluir"
        hint="Lo que apagues no viaja. En «Editar mi perfil», además, un bloque apagado no se puede tocar al volver a subir."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {MARKDOWN_BLOCKS.map((block) => (
            <Toggle
              key={block.key}
              on={blocks.has(block.key)}
              onChange={() => toggle(block.key)}
              label={block.label}
              hint={block.hint}
            />
          ))}
        </div>
        <div className="flex gap-3 text-xs">
          <button
            type="button"
            onClick={() => setBlocks(new Set(ALL_BLOCKS))}
            className="font-medium text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setBlocks(new Set())}
            className="font-medium text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Ninguno
          </button>
        </div>
      </Section>

      {warnings.length > 0 && (
        <div className="rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
          <p className="font-semibold">
            Hay encabezados Markdown dentro de un texto
          </p>
          <p className="mt-1">
            El formato reserva <code>#</code> para su propia estructura, así que
            estos textos podrían leerse mal al volver a subirlos:
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

    </TabBody>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 2 — bringing the rewritten document back                               */
/* -------------------------------------------------------------------------- */

function UploadTab({
  data,
  onReview,
}: {
  data: ResumeData;
  onReview: (pasted: PastedDocument) => void;
}) {
  const [text, setText] = useState("");
  const [override, setOverride] = useState<Lang | "">("");
  const [error, setError] = useState<string | null>(null);

  // Parsing is cheap and pure, so the panel can say what it found while you are
  // still pasting rather than only once you press the button.
  const doc = useMemo(
    () => (text.trim() ? parseResumeMarkdown(text) : null),
    [text],
  );
  const lang: Lang | null = override || doc?.lang || null;

  function review() {
    setError(null);
    if (!doc) return;
    if (doc.bothLanguages) {
      setError(
        "Ese documento trae los dos idiomas. Sube uno a la vez: pídele a la IA " +
          "solo el bloque del idioma que quieres actualizar.",
      );
      return;
    }
    if (!lang) {
      setError("Elige de qué idioma es antes de revisar los cambios.");
      return;
    }
    if (doc.sections.size === 0) {
      setError(
        "No reconocí ninguna sección. ¿Pegaste el documento completo, con sus " +
          "encabezados «## Experience», «## Education»…?",
      );
      return;
    }
    const plan = planImport(data[lang], doc);
    if (plan.groups.length === 0) {
      setError("Ese documento dice exactamente lo mismo que la web: no hay nada que cambiar.");
      return;
    }
    onReview({ lang, doc, plan });
  }

  return (
    <TabBody
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-neutral-400">
            Nada se publica hasta la ventana siguiente.
          </p>
          <button
            type="button"
            onClick={review}
            disabled={!text.trim()}
            className={primaryButton}
          >
            Revisar cambios
          </button>
        </div>
      }
    >
      <Section
        title="Pega aquí el documento que devolvió la IA"
        hint="Un idioma a la vez. Nada se publica todavía: lo siguiente es una ventana con todos los cambios, uno por uno."
      >
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          rows={14}
          spellCheck={false}
          placeholder={"<!-- resume:lang en -->\n\n# English content\n\n## Header\n…"}
          aria-label="Documento Markdown"
          className={`${fieldBox} resize-y font-mono text-xs leading-5`}
        />
      </Section>

      {doc && (
        <div className="rounded-xl bg-black/[0.03] px-4 py-3 text-xs dark:bg-white/[0.04]">
          {doc.bothLanguages ? (
            <p className="font-medium">Trae los dos idiomas.</p>
          ) : (
            <>
              <p>
                <span className="font-medium">
                  {doc.lang
                    ? `Documento en ${LANG_NAME[doc.lang]}`
                    : "Idioma sin identificar"}
                </span>{" "}
                · {doc.sections.size}{" "}
                {doc.sections.size === 1 ? "sección" : "secciones"}:{" "}
                {[...doc.sections].join(", ") || "ninguna"}
              </p>
              {!doc.lang && (
                <label className="mt-2 flex items-center gap-2">
                  <span>Es de la versión en</span>
                  <select
                    value={override}
                    onChange={(e) => setOverride(e.target.value as Lang | "")}
                    className="rounded-lg border border-black/10 bg-white px-2 py-1 dark:border-white/15 dark:bg-black/30"
                  >
                    <option value="">— elige —</option>
                    <option value="en">inglés</option>
                    <option value="es">español</option>
                  </select>
                </label>
              )}
              {doc.warnings.length > 0 && (
                <ul className="mt-2 list-disc space-y-0.5 pl-4 text-amber-700 dark:text-amber-400">
                  {doc.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-500/10 px-4 py-3 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

    </TabBody>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab 3 — the LaTeX CV                                                       */
/* -------------------------------------------------------------------------- */

function CvTab({
  data,
  onLatexChange,
}: {
  data: ResumeData;
  onLatexChange: (latex: string) => void;
}) {
  const stored = data.shared.cvLatex ?? "";
  const [text, setText] = useState(stored);
  const [saved, setSaved] = useState(false);
  // Seeded once per open: the dialog is remounted each time it is shown, so
  // there is nothing to re-sync while it is on screen.
  const dirty = text !== stored;

  function save() {
    onLatexChange(text);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  return (
    <TabBody
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setText(DEFAULT_CV_LATEX)}
            className="text-xs font-medium text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Restaurar la plantilla de ejemplo
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {saved && (
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                Queda como cambio sin guardar arriba
              </span>
            )}
            <button
              type="button"
              onClick={() => downloadText("cv-vicente-gomez.tex", text)}
              disabled={!text.trim()}
              className={ghostButton}
            >
              Descargar .tex
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className={primaryButton}
            >
              {saved ? "Guardado ✓" : "Guardar como plantilla"}
            </button>
          </div>
        </div>
      }
    >
      <Section
        title="El CV en LaTeX"
        hint="Este mismo texto es la forma que se le pide a la IA que siga y donde pegas el CV que te devuelve. Pégalo encima, descárgalo, y guárdalo como plantilla solo si te convence."
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={16}
          spellCheck={false}
          placeholder="\documentclass[letter,10pt]{article}…"
          aria-label="CV en LaTeX"
          className={`${fieldBox} resize-y font-mono text-xs leading-5`}
        />
        <p className="text-xs text-neutral-400">{sizeOf(text)}</p>
      </Section>

      <div className="rounded-xl bg-black/[0.03] px-4 py-3 text-xs text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400">
        Aquí no se compila nada: no hay LaTeX en el servidor. Descarga el
        <code className="mx-1">.tex</code> y compílalo donde quieras; el PDF que
        sirve <code>/cv</code> se sube aparte, en la pestaña General.
      </div>

    </TabBody>
  );
}

/* -------------------------------------------------------------------------- */
/* The review before publishing                                               */
/* -------------------------------------------------------------------------- */

const KIND_BADGE: Record<ImportGroup["kind"], { label: string; className: string }> = {
  add: {
    label: "Nuevo",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  edit: {
    label: "Cambia",
    className: "bg-black/[0.06] text-neutral-600 dark:bg-white/10 dark:text-neutral-300",
  },
  remove: {
    label: "Elimina",
    className: "bg-red-500/15 text-red-600 dark:text-red-400",
  },
};

/**
 * Every change the paste would make, before it makes any of them.
 *
 * One tick box per item, ticked by default — except anything that erases, which
 * arrives unticked and has to be chosen deliberately. Publishing writes only
 * what is ticked; see `applyImport`.
 */
function ImportReview({
  lang,
  plan,
  busy = false,
  onApply,
  onClose,
}: {
  lang: Lang;
  plan: ImportPlan;
  busy?: boolean;
  onApply: (selected: Set<string>) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => defaultSelection(plan));
  useEscape(onClose);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const destructive = plan.groups.filter((g) => g.destructive).length;
  const chosen = plan.groups.filter((g) => selected.has(g.key)).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Revisar los cambios en ${LANG_NAME[lang]}`}
      className="fixed inset-0 z-[90] flex items-stretch justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl sm:h-[min(92vh,940px)] sm:rounded-3xl dark:bg-neutral-900">
        {/* Header */}
        <div className="shrink-0 border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">
                Revisar los cambios en {LANG_NAME[lang]}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {plan.groups.length}{" "}
                {plan.groups.length === 1 ? "cambio" : "cambios"} · a la izquierda
                lo que dice la web hoy, a la derecha lo que dice el documento.
                {destructive > 0 &&
                  ` ${destructive} ${
                    destructive === 1 ? "borra algo y viene" : "borran algo y vienen"
                  } sin marcar.`}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="rounded-full px-2 py-1 text-sm text-neutral-400 transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <button
              type="button"
              onClick={() => setSelected(new Set(plan.groups.map((g) => g.key)))}
              className="font-medium text-neutral-500 hover:underline dark:text-neutral-400"
            >
              Marcar todo
            </button>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="font-medium text-neutral-500 hover:underline dark:text-neutral-400"
            >
              Desmarcar todo
            </button>
            <button
              type="button"
              onClick={() => setSelected(defaultSelection(plan))}
              className="font-medium text-neutral-500 hover:underline dark:text-neutral-400"
            >
              Volver a lo sugerido
            </button>
          </div>
        </div>

        {/* Changes */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {(plan.warnings.length > 0 || plan.reordered.length > 0) && (
            <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              <ul className="list-disc space-y-1 pl-4">
                {plan.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
                {plan.reordered.length > 0 && (
                  <li>
                    El documento reordena {plan.reordered.join(", ")}. Los
                    elementos quedarán en el orden en que vienen ahí.
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="grid gap-3">
            {plan.groups.map((group) => (
              <GroupCard
                key={group.key}
                group={group}
                on={selected.has(group.key)}
                onToggle={() => toggle(group.key)}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-black/5 px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-neutral-400">
              Lo que dejes sin marcar se queda exactamente como está hoy.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className={ghostButton}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => onApply(selected)}
                disabled={busy || chosen === 0}
                className={primaryButton}
              >
                {busy
                  ? "Publicando…"
                  : `Publicar ${chosen} ${chosen === 1 ? "cambio" : "cambios"}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One item's changes, with the tick box that decides whether they happen. */
function GroupCard({
  group,
  on,
  onToggle,
}: {
  group: ImportGroup;
  on: boolean;
  onToggle: () => void;
}) {
  const badge = KIND_BADGE[group.kind];
  return (
    <section
      className={`rounded-2xl border transition ${
        on
          ? "border-black/15 dark:border-white/20"
          : "border-black/10 opacity-60 dark:border-white/10"
      }`}
    >
      <label className="flex cursor-pointer items-center gap-3 border-b border-black/5 px-4 py-2.5 dark:border-white/10">
        <input
          type="checkbox"
          checked={on}
          onChange={onToggle}
          className="h-4 w-4 shrink-0 accent-black dark:accent-white"
        />
        <span className="min-w-0 flex-1 text-sm font-semibold">{group.title}</span>
        {group.destructive && group.kind !== "remove" && (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
            borra texto
          </span>
        )}
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </label>
      <div className="grid gap-3 p-4">
        {group.fields.map((field, i) => (
          <div key={`${field.label}-${i}`} className="grid gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {field.label}
            </span>
            <div className="grid gap-2 md:grid-cols-2 md:gap-3">
              <Value text={field.before} tone="before" />
              <Value text={field.after} tone="after" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/** One side of a before/after pair. Long text scrolls rather than pushing. */
function Value({ text, tone }: { text: string; tone: "before" | "after" }) {
  return (
    <div
      className={`max-h-52 overflow-y-auto rounded-xl px-3 py-2 text-sm ${
        tone === "before"
          ? "bg-black/[0.03] text-neutral-500 dark:bg-white/[0.04] dark:text-neutral-400"
          : "bg-emerald-500/[0.08] text-neutral-800 dark:text-neutral-100"
      }`}
    >
      {text.trim() ? (
        <span className="whitespace-pre-wrap break-words">{text}</span>
      ) : (
        <span className="italic text-neutral-400">(vacío)</span>
      )}
    </div>
  );
}
