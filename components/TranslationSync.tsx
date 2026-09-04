"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/resume-content";
import type {
  PendingTranslation,
  TranslationChange,
  TranslationEdit,
} from "@/lib/translation-sync";

/**
 * Keeping the two language versions in step.
 *
 * Saving a change to one language opens {@link TranslationPrompt} — yes, no, or
 * later. "Yes" opens {@link TranslationPanel}, which shows the language that
 * was edited on the left and the other one, editable, on the right, grouped by
 * item so every field of "Experiencia #1" is reviewed together. "Later" parks
 * the groups in {@link PendingBell}, the bell in the admin navbar, until they
 * are reviewed.
 *
 * The pairing itself — which fields exist, what changed, and how a reviewed
 * value is written back — lives in `lib/translation-sync.ts`.
 */

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

const LANG_NAME: Record<Lang, string> = { en: "inglés", es: "español" };

/** "en" reads as English → Spanish; "es" mirrors it. */
function directions(from: Lang): { source: string; target: string } {
  return {
    source: LANG_NAME[from],
    target: LANG_NAME[from === "en" ? "es" : "en"],
  };
}

function fieldId(slot: string, fieldKey: string): string {
  return `${slot}::${fieldKey}`;
}

function countFields(changes: TranslationChange[]): number {
  return changes.reduce((n, c) => n + c.fields.length, 0);
}

/** "hace 5 min", "hace 2 h", "hace 3 días" — enough to sort the bell by feel. */
function relativeTime(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "ayer" : `hace ${days} días`;
}

/* -------------------------------------------------------------------------- */
/* Shared chrome                                                              */
/* -------------------------------------------------------------------------- */

/** Close on Escape — every overlay here is dismissible. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

const primaryButton =
  "rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50 dark:bg-white dark:text-black";
const ghostButton =
  "rounded-full border border-black/10 px-4 py-2 text-sm font-semibold transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10";
const fieldBox =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";

/* -------------------------------------------------------------------------- */
/* The prompt after a save                                                    */
/* -------------------------------------------------------------------------- */

export function TranslationPrompt({
  from,
  changes,
  onReview,
  onSkip,
  onLater,
}: {
  from: Lang;
  changes: TranslationChange[];
  onReview: () => void;
  onSkip: () => void;
  onLater: () => void;
}) {
  const { source, target } = directions(from);
  useEscape(onLater);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Actualizar la versión en ${target}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-neutral-900">
        <h2 className="text-lg font-semibold tracking-tight">
          ¿Actualizamos la versión en {target}?
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Guardaste {countFields(changes)}{" "}
          {countFields(changes) === 1 ? "cambio" : "cambios"} en la versión en{" "}
          {source}, en {changes.length}{" "}
          {changes.length === 1 ? "elemento" : "elementos"}.
        </p>

        <ul className="mt-4 max-h-52 space-y-1 overflow-y-auto rounded-xl bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
          {changes.map((change) => (
            <li key={change.key} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-medium">{change.title}</span>
              <span className="shrink-0 text-xs text-neutral-400">
                {change.fields.length}{" "}
                {change.fields.length === 1 ? "campo" : "campos"}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onSkip} className={ghostButton}>
            No
          </button>
          <button type="button" onClick={onLater} className={ghostButton}>
            Después
          </button>
          <button type="button" onClick={onReview} className={primaryButton}>
            Sí, revisar
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-400">
          «Después» lo deja en la campana del panel; «No» lo descarta.
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The side-by-side panel                                                     */
/* -------------------------------------------------------------------------- */

export function TranslationPanel({
  from,
  changes,
  gaps,
  busy = false,
  onApply,
  onLater,
  onCancel,
}: {
  from: Lang;
  changes: TranslationChange[];
  gaps: Array<{ title: string; source: number; target: number }>;
  busy?: boolean;
  onApply: (edits: TranslationEdit[]) => void;
  onLater: () => void;
  onCancel: () => void;
}) {
  const { source, target } = directions(from);
  useEscape(onCancel);

  // The editable right-hand side, seeded with what the target language says
  // today. Keyed by slot + field so a re-render never mixes two items up.
  const initial = useMemo(() => {
    const seed: Record<string, string> = {};
    for (const change of changes) {
      for (const f of change.fields) seed[fieldId(change.slot, f.fieldKey)] = f.to;
    }
    return seed;
  }, [changes]);
  // Seeded once: the panel is remounted (keyed) each time it is opened, so
  // there is nothing to re-sync while it is on screen.
  const [values, setValues] = useState<Record<string, string>>(initial);

  const setValue = (slot: string, fieldKey: string, value: string) =>
    setValues((prev) => ({ ...prev, [fieldId(slot, fieldKey)]: value }));

  function apply() {
    const edits: TranslationEdit[] = [];
    for (const change of changes) {
      for (const f of change.fields) {
        edits.push({
          slot: change.slot,
          fieldKey: f.fieldKey,
          value: values[fieldId(change.slot, f.fieldKey)] ?? f.to,
        });
      }
    }
    onApply(edits);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Actualizar la versión en ${target}`}
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex h-full w-full max-w-5xl flex-col bg-white shadow-2xl sm:h-[min(90vh,900px)] sm:rounded-3xl dark:bg-neutral-900">
        {/* Header */}
        <div className="shrink-0 border-b border-black/5 px-5 py-4 dark:border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">
                Actualizar la versión en {target}
              </h2>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                A la izquierda, lo que acabas de guardar en {source}. A la derecha,
                el {target} — editable.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              aria-label="Cerrar"
              className="rounded-full px-2 py-1 text-sm text-neutral-400 transition hover:bg-black/5 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Groups */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {gaps.length > 0 && (
            <div className="mb-4 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
              <p className="font-semibold">Listas con distinto largo</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {gaps.map((gap) => (
                  <li key={gap.title}>
                    {gap.title}: {gap.source} en {source}, {gap.target} en {target}.
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-xs">
                Agregar o eliminar elementos se hace en cada pestaña; aquí solo se
                emparejan los que existen en las dos.
              </p>
            </div>
          )}

          <div className="grid gap-4">
            {changes.map((change) => (
              <section
                key={change.key}
                className="rounded-2xl border border-black/10 dark:border-white/10"
              >
                <h3 className="border-b border-black/5 px-4 py-2.5 text-sm font-semibold dark:border-white/10">
                  {change.title}
                </h3>
                <div className="grid gap-4 p-4">
                  {change.fields.map((f) => (
                    <FieldRow
                      key={f.fieldKey}
                      label={f.label}
                      from={f.from}
                      multiline={f.multiline}
                      value={values[fieldId(change.slot, f.fieldKey)] ?? f.to}
                      onChange={(v) => setValue(change.slot, f.fieldKey, v)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-black/5 px-5 py-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className={ghostButton}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onLater}
              disabled={busy}
              className={ghostButton}
            >
              Dejar para después
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className={primaryButton}
            >
              {busy ? "Guardando…" : `Guardar ${target}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One field, source on the left and target on the right. "Copiar" brings the
 * source value over — the quick path for dates, URLs and names that read the
 * same in both languages.
 */
function FieldRow({
  label,
  from,
  value,
  multiline,
  onChange,
}: {
  label: string;
  from: string;
  value: string;
  multiline: boolean;
  onChange: (value: string) => void;
}) {
  const rows = multiline ? Math.min(10, Math.max(3, from.split("\n").length + 1)) : 1;
  return (
    <div className="grid gap-2 md:grid-cols-2 md:gap-4">
      <div className="md:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {label}
          </span>
          <button
            type="button"
            onClick={() => onChange(from)}
            className="shrink-0 text-xs font-medium text-neutral-500 hover:underline dark:text-neutral-400"
          >
            Copiar ⟶
          </button>
        </div>
      </div>
      <div className="rounded-xl bg-black/[0.03] px-3 py-2 text-sm text-neutral-600 dark:bg-white/[0.04] dark:text-neutral-300">
        {from.trim() ? (
          <span className="whitespace-pre-wrap break-words">{from}</span>
        ) : (
          <span className="italic text-neutral-400">(vacío)</span>
        )}
      </div>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={`${fieldBox} resize-y leading-6`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={fieldBox}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The bell                                                                   */
/* -------------------------------------------------------------------------- */

export function PendingBell({
  pending,
  onOpen,
  onDismiss,
}: {
  pending: PendingTranslation[];
  /** Open the panel for one direction: all of that direction's entries. */
  onOpen: (from: Lang) => void;
  onDismiss: (entry: PendingTranslation) => void;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Click-away, so the dropdown behaves like a menu rather than a panel.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  const count = pending.length;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          count === 0
            ? "Sin traducciones pendientes"
            : `${count} ${count === 1 ? "elemento" : "elementos"} por traducir`
        }
        className="relative rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        <span aria-hidden="true">🔔</span>
        <span className="sr-only">Traducciones pendientes</span>
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-neutral-900"
        >
          <p className="border-b border-black/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-white/10">
            Pendientes de traducir
          </p>

          {count === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-neutral-400">
              Nada pendiente. Al guardar un cambio en un idioma te pregunto por el
              otro.
            </p>
          ) : (
            <>
              <ul className="max-h-72 divide-y divide-black/5 overflow-y-auto dark:divide-white/10">
                {pending.map((entry) => {
                  const { target } = directions(entry.from);
                  return (
                    <li
                      key={`${entry.from}:${entry.key}`}
                      className="flex items-start gap-2 px-4 py-2.5"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onOpen(entry.from);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <span className="block truncate text-sm font-medium">
                          {entry.title || entry.key}
                        </span>
                        <span className="mt-0.5 block text-xs text-neutral-400">
                          {entry.fieldKeys.length}{" "}
                          {entry.fieldKeys.length === 1 ? "campo" : "campos"} · al{" "}
                          {target} · {relativeTime(entry.queuedAt)}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismiss(entry)}
                        aria-label={`Descartar ${entry.title}`}
                        title="Descartar sin traducir"
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-neutral-400 transition hover:bg-black/5 hover:text-red-500 dark:hover:bg-white/10"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap gap-2 border-t border-black/5 px-4 py-3 dark:border-white/10">
                {(["en", "es"] as Lang[])
                  .filter((lang) => pending.some((p) => p.from === lang))
                  .map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpen(lang);
                      }}
                      className={primaryButton}
                    >
                      Revisar {directions(lang).target}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
