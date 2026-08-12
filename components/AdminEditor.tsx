"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  logoutAction,
  saveContentAction,
  uploadCvAction,
  uploadImageAction,
} from "@/app/admin/actions";
import {
  type AnchorType,
  type Lang,
  type LangContent,
  type ProjectPost,
  type ResumeData,
  resolveAnchor,
} from "@/lib/resume-content";
import { resumeToMarkdown } from "@/lib/resume-markdown";
import { slugify } from "@/lib/slug";

type Tab = "general" | "projects" | "en" | "es";

/* -------------------------------------------------------------------------- */
/* Association (anchor) helpers                                               */
/* -------------------------------------------------------------------------- */

/**
 * Build the list of association targets from the English content — the canonical
 * list of ids that both English-only projects and the shared publications point
 * at. Values encode `type:id`; the empty value means "not associated".
 *
 * Projects are keyed by their unique `slug` and only offered when
 * `includeProjects` is set (publications may point at a project so it can list
 * its related posts; projects themselves never anchor to another project).
 */
function anchorOptions(
  data: ResumeData,
  { includeProjects = false, excludeAwards = false } = {},
): { value: string; label: string }[] {
  const opts = [{ value: "", label: "— Sin asociar —" }];
  const add = (type: AnchorType, id: string, label: string) => {
    if (id) opts.push({ value: `${type}:${id}`, label });
  };
  const withPlace = (title: string, place: string) =>
    place ? `${title || "—"} (${place})` : title || "—";
  for (const e of data.en.experiences)
    add("experience", e.id, `Experiencia · ${withPlace(e.role, e.place)}`);
  for (const e of data.en.education)
    add("education", e.id, `Educación · ${withPlace(e.title, e.place)}`);
  if (!excludeAwards) {
    for (const a of data.en.awards)
      add("award", a.id, `Reconocimiento · ${withPlace(a.title, a.place)}`);
  }
  for (const c of data.en.courses)
    add("course", c.id, `Curso · ${withPlace(c.title, c.place)}`);
  for (const v of data.en.volunteering)
    add("volunteering", v.id, `Voluntariado · ${withPlace(v.title, v.place)}`);
  if (includeProjects) {
    for (const p of data.projects ?? [])
      add("project", p.slug, `Proyecto · ${p.title || p.slug || "—"}`);
  }
  return opts;
}

/** Split a `type:id` select value back into its parts. */
function parseAnchor(value: string): { anchorType: AnchorType; anchorId: string } {
  if (!value) return { anchorType: "", anchorId: "" };
  const idx = value.indexOf(":");
  return {
    anchorType: value.slice(0, idx) as AnchorType,
    anchorId: value.slice(idx + 1),
  };
}

/** Best-effort unique id for newly added items (e.g. experiences). */
function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/* -------------------------------------------------------------------------- */
/* Reusable field primitives                                                  */
/* -------------------------------------------------------------------------- */

const inputClass =
  "mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-black/30 dark:focus:border-white/30";

function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputClass} resize-y leading-6`}
      />
    </label>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 px-3.5 py-2.5 dark:border-white/15">
      <div>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-neutral-400">{hint}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-black dark:bg-white" : "bg-black/15 dark:bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform dark:bg-black ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-neutral-400">{hint}</span>}
    </label>
  );
}

/** Dropdown to associate a project/publication with a résumé item. */
function AnchorSelect({
  data,
  item,
  onChange,
  label = "Asociar a",
  hint,
  includeProjects = false,
  excludeAwards = false,
}: {
  data: ResumeData;
  item: { anchorType?: AnchorType; anchorId?: string; experienceId?: string };
  onChange: (anchorType: AnchorType, anchorId: string) => void;
  label?: string;
  hint?: string;
  includeProjects?: boolean;
  excludeAwards?: boolean;
}) {
  const a = resolveAnchor(item);
  const value = a.type ? `${a.type}:${a.id}` : "";
  return (
    <SelectField
      label={label}
      value={value}
      onChange={(v) => {
        const { anchorType, anchorId } = parseAnchor(v);
        onChange(anchorType, anchorId);
      }}
      options={anchorOptions(data, { includeProjects, excludeAwards })}
      hint={hint}
    />
  );
}

function ImageUploadField({
  label,
  value,
  onChange,
  hint,
  fit,
  onFitChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  fit?: "contain" | "cover";
  onFitChange?: (v: "contain" | "cover") => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImageAction(fd);
      if (res.error) setError(res.error);
      else if (res.url) onChange(res.url);
    } catch {
      setError("No se pudo subir la imagen (máx. 5 MB).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of uploaded image
          <img
            src={value}
            alt="Vista previa"
            className={`h-20 w-32 rounded-lg ring-1 ring-black/10 dark:ring-white/15 ${
              onFitChange && fit !== "cover"
                ? "bg-black/5 object-contain dark:bg-white/10"
                : "object-cover"
            }`}
          />
        ) : (
          <div className="flex h-20 w-32 items-center justify-center rounded-lg bg-black/5 text-xs text-neutral-400 dark:bg-white/10">
            Sin imagen
          </div>
        )}
        <div className="grid gap-2">
          <label className="w-fit cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] dark:bg-white dark:text-black">
            {uploading ? "Subiendo…" : "Subir imagen"}
            <input
              type="file"
              accept="image/*"
              onChange={onFile}
              disabled={uploading}
              className="hidden"
            />
          </label>
          {onFitChange && value && (
            <div
              role="group"
              aria-label="Ajuste de la imagen"
              className="inline-flex w-fit rounded-full bg-black/5 p-0.5 text-xs font-semibold dark:bg-white/10"
            >
              <button
                type="button"
                onClick={() => onFitChange("contain")}
                aria-pressed={fit !== "cover"}
                className={`rounded-full px-3 py-1 transition ${
                  fit !== "cover"
                    ? "bg-white shadow-sm dark:bg-white/25"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                Ajustar
              </button>
              <button
                type="button"
                onClick={() => onFitChange("cover")}
                aria-pressed={fit === "cover"}
                className={`rounded-full px-3 py-1 transition ${
                  fit === "cover"
                    ? "bg-white shadow-sm dark:bg-white/25"
                    : "text-neutral-500 dark:text-neutral-400"
                }`}
              >
                Rellenar
              </button>
            </div>
          )}
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-sm font-medium text-red-500 hover:underline"
            >
              Quitar imagen
            </button>
          )}
        </div>
      </div>
      {onFitChange && value && (
        <span className="text-xs text-neutral-400">
          “Ajustar”: muestra la imagen completa sin recortar (con márgenes).
          “Rellenar”: llena la tarjeta y recorta los bordes.
        </span>
      )}
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Image field that accepts either a pasted URL or an uploaded file. The value
 * is always a URL string; uploading just fills it in for you.
 */
function ImageInputField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImageAction(fd);
      if (res.error) setError(res.error);
      else if (res.url) onChange(res.url);
    } catch {
      setError("No se pudo subir la imagen (máx. 5 MB).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col items-start gap-3 sm:flex-row">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- preview of a URL/uploaded image
          <img
            src={value}
            alt="Vista previa"
            className="h-20 w-32 shrink-0 rounded-lg object-cover ring-1 ring-black/10 dark:ring-white/15"
          />
        ) : (
          <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-lg bg-black/5 text-xs text-neutral-400 dark:bg-white/10">
            Sin imagen
          </div>
        )}
        <div className="grid w-full gap-2">
          <input
            type="text"
            value={value}
            placeholder="https://… (pega un enlace o sube una imagen)"
            onChange={(e) => onChange(e.target.value)}
            className={inputClass}
          />
          <div className="flex items-center gap-3">
            <label className="w-fit cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] dark:bg-white dark:text-black">
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-sm font-medium text-red-500 hover:underline"
              >
                Quitar
              </button>
            )}
          </div>
        </div>
      </div>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function PdfUploadField({
  label,
  value,
  onChange,
  hint,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Let the server delete the previous PDF from storage after upload.
      fd.append("previousUrl", value);
      const res = await uploadCvAction(fd);
      if (res.error) setError(res.error);
      else if (res.url) onChange(res.url);
    } catch {
      setError("No se pudo subir el PDF (máx. 5 MB).");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className={`grid gap-2 ${disabled ? "opacity-50" : ""}`}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        {value ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-black/10 hover:bg-black/10 dark:bg-white/10 dark:text-neutral-200 dark:ring-white/15"
          >
            📄 Ver PDF actual
          </a>
        ) : (
          <div className="flex items-center rounded-lg bg-black/5 px-3 py-2 text-xs text-neutral-400 dark:bg-white/10">
            Sin PDF
          </div>
        )}
        <div className="grid gap-2">
          <label
            className={`w-fit rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] dark:bg-white dark:text-black ${
              disabled ? "pointer-events-none" : "cursor-pointer"
            }`}
          >
            {uploading ? "Subiendo…" : "Subir PDF"}
            <input
              type="file"
              accept="application/pdf"
              onChange={onFile}
              disabled={uploading || disabled}
              className="hidden"
            />
          </label>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="text-left text-sm font-medium text-red-500 hover:underline"
            >
              Quitar PDF
            </button>
          )}
        </div>
      </div>
      {hint && <span className="text-xs text-neutral-400">{hint}</span>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-6 dark:bg-white/[0.06] dark:ring-white/10">
      <h2 className="mb-4 text-base font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function RepeatableList<T>({
  items,
  onChange,
  template,
  makeItem,
  addLabel,
  itemLabel,
  renderItem,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  template: T;
  /** Factory for a fresh item (use when a new item needs a unique id/slug). */
  makeItem?: () => T;
  addLabel: string;
  itemLabel: (index: number) => string;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  function updateAt(index: number, patch: Partial<T>) {
    onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-3">
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-black/10 p-4 dark:border-white/10"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {itemLabel(index)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Subir"
                className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === items.length - 1}
                aria-label="Bajar"
                className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-black/5 disabled:opacity-30 dark:hover:bg-white/10"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(index)}
                className="rounded-md px-2 py-1 text-sm font-medium text-red-500 hover:bg-red-500/10"
              >
                Eliminar
              </button>
            </div>
          </div>
          <div className="grid gap-3">
            {renderItem(item, (patch) => updateAt(index, patch))}
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          onChange([...items, makeItem ? makeItem() : structuredClone(template)])
        }
        className="rounded-xl border border-dashed border-black/20 px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:border-black/40 hover:bg-black/5 dark:border-white/20 dark:text-neutral-300 dark:hover:bg-white/5"
      >
        + {addLabel}
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Language content editor                                                    */
/* -------------------------------------------------------------------------- */

function LangEditor({
  content,
  onChange,
  data,
}: {
  content: LangContent;
  onChange: (next: LangContent) => void;
  data: ResumeData;
}) {
  const set = <K extends keyof LangContent>(key: K, value: LangContent[K]) =>
    onChange({ ...content, [key]: value });

  return (
    <div className="grid gap-5">
      <Card title="Encabezado / Hero">
        <ToggleField
          label="Mostrar insignia de disponibilidad"
          checked={content.badgeEnabled}
          onChange={(v) => set("badgeEnabled", v)}
        />
        <TextField
          label="Insignia (disponibilidad)"
          value={content.badge}
          onChange={(v) => set("badge", v)}
          hint="Ej.: “Disponible para prácticas 2026”."
        />
        <TextField
          label="Subtítulo"
          value={content.subtitle}
          onChange={(v) => set("subtitle", v)}
        />
        <TextAreaField
          label="Descripción"
          value={content.description}
          onChange={(v) => set("description", v)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Botón principal (CV)"
            value={content.primaryCta}
            onChange={(v) => set("primaryCta", v)}
          />
          <TextField
            label="Botón secundario"
            value={content.secondaryCta}
            onChange={(v) => set("secondaryCta", v)}
          />
        </div>
      </Card>

      <Card title="Menú de navegación">
        <div className="grid gap-3 sm:grid-cols-2">
          {content.nav.map((item) => (
            <TextField
              key={item.id}
              label={`Etiqueta: ${item.id}`}
              value={item.label}
              onChange={(v) =>
                set(
                  "nav",
                  content.nav.map((n) => (n.id === item.id ? { ...n, label: v } : n)),
                )
              }
            />
          ))}
        </div>
      </Card>

      <Card title="Destacados">
        <RepeatableList
          items={content.highlights}
          onChange={(list) => set("highlights", list)}
          template={{ value: "", label: "" }}
          addLabel="Añadir destacado"
          itemLabel={(i) => `Destacado ${i + 1}`}
          renderItem={(item, update) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <TextField
                label="Valor"
                value={item.value}
                onChange={(v) => update({ value: v })}
              />
              <TextField
                label="Etiqueta"
                value={item.label}
                onChange={(v) => update({ label: v })}
              />
            </div>
          )}
        />
      </Card>

      <Card title="Sobre mí">
        <TextField
          label="Título de la sección"
          value={content.aboutTitle}
          onChange={(v) => set("aboutTitle", v)}
        />
        <TextAreaField
          label="Texto"
          value={content.about}
          onChange={(v) => set("about", v)}
          rows={4}
        />
      </Card>

      <Card title="Experiencia">
        <TextField
          label="Título de la sección"
          value={content.experienceTitle}
          onChange={(v) => set("experienceTitle", v)}
        />
        <RepeatableList
          items={content.experiences}
          onChange={(list) => set("experiences", list)}
          template={{ id: "", role: "", place: "", date: "", text: "", skills: "" }}
          makeItem={() => ({
            id: newId(),
            role: "",
            place: "",
            date: "",
            text: "",
            skills: "",
          })}
          addLabel="Añadir experiencia"
          itemLabel={(i) => `Experiencia ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Cargo"
                  value={item.role}
                  onChange={(v) => update({ role: v })}
                />
                <TextField
                  label="Lugar"
                  value={item.place}
                  onChange={(v) => update({ place: v })}
                />
              </div>
              <TextField
                label="Fecha"
                value={item.date}
                onChange={(v) => update({ date: v })}
              />
              <TextAreaField
                label="Descripción"
                value={item.text}
                onChange={(v) => update({ text: v })}
              />
              <TextField
                label="Habilidades (opcional)"
                value={item.skills}
                onChange={(v) => update({ skills: v })}
                hint="Etiquetas separadas por comas o «·». Se muestran de forma discreta bajo la descripción."
              />
            </>
          )}
        />
      </Card>

      <Card title="Educación">
        <TextField
          label="Título de la sección"
          value={content.educationTitle}
          onChange={(v) => set("educationTitle", v)}
        />
        <RepeatableList
          items={content.education}
          onChange={(list) => set("education", list)}
          template={{ id: "", title: "", place: "", date: "", text: "" }}
          makeItem={() => ({ id: newId(), title: "", place: "", date: "", text: "" })}
          addLabel="Añadir educación"
          itemLabel={(i) => `Educación ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Título / programa"
                  value={item.title}
                  onChange={(v) => update({ title: v })}
                />
                <TextField
                  label="Institución"
                  value={item.place}
                  onChange={(v) => update({ place: v })}
                />
              </div>
              <TextField
                label="Fecha"
                value={item.date}
                onChange={(v) => update({ date: v })}
              />
              <TextAreaField
                label="Detalle"
                value={item.text}
                onChange={(v) => update({ text: v })}
              />
            </>
          )}
        />
      </Card>

      <Card title="Habilidades">
        <TextField
          label="Título de la sección"
          value={content.skillsTitle}
          onChange={(v) => set("skillsTitle", v)}
        />
        <RepeatableList
          items={content.skills}
          onChange={(list) => set("skills", list)}
          template={{ title: "", text: "" }}
          addLabel="Añadir habilidad"
          itemLabel={(i) => `Grupo ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <TextField
                label="Título"
                value={item.title}
                onChange={(v) => update({ title: v })}
              />
              <TextAreaField
                label="Detalle"
                value={item.text}
                onChange={(v) => update({ text: v })}
                rows={2}
              />
            </>
          )}
        />
      </Card>

      <Card title="Reconocimientos">
        <TextField
          label="Título de la sección"
          value={content.awardsTitle}
          onChange={(v) => set("awardsTitle", v)}
        />
        <RepeatableList
          items={content.awards}
          onChange={(list) => set("awards", list)}
          template={{
            id: "",
            title: "",
            place: "",
            date: "",
            text: "",
            anchorType: "" as AnchorType,
            anchorId: "",
          }}
          makeItem={() => ({
            id: newId(),
            title: "",
            place: "",
            date: "",
            text: "",
            anchorType: "" as AnchorType,
            anchorId: "",
          })}
          addLabel="Añadir reconocimiento"
          itemLabel={(i) => `Reconocimiento ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Reconocimiento / premio"
                  value={item.title}
                  onChange={(v) => update({ title: v })}
                />
                <TextField
                  label="Otorgado por"
                  value={item.place}
                  onChange={(v) => update({ place: v })}
                />
              </div>
              <TextField
                label="Fecha"
                value={item.date}
                onChange={(v) => update({ date: v })}
              />
              <TextAreaField
                label="Detalle"
                value={item.text}
                onChange={(v) => update({ text: v })}
                rows={2}
              />
              <AnchorSelect
                data={data}
                item={item}
                excludeAwards
                onChange={(anchorType, anchorId) =>
                  update({ anchorType, anchorId })
                }
                hint="Opcional. Asócialo a una educación (u otro elemento) y aparecerá como etiqueta en esa tarjeta del CV."
              />
            </>
          )}
        />
      </Card>

      <Card title="Cursos adicionales">
        <TextField
          label="Título de la sección"
          value={content.coursesTitle}
          onChange={(v) => set("coursesTitle", v)}
        />
        <RepeatableList
          items={content.courses}
          onChange={(list) => set("courses", list)}
          template={{
            id: "",
            title: "",
            place: "",
            date: "",
            text: "",
            certificateUrl: "",
          }}
          makeItem={() => ({
            id: newId(),
            title: "",
            place: "",
            date: "",
            text: "",
            certificateUrl: "",
          })}
          addLabel="Añadir curso"
          itemLabel={(i) => `Curso ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Curso / certificación"
                  value={item.title}
                  onChange={(v) => update({ title: v })}
                />
                <TextField
                  label="Institución"
                  value={item.place}
                  onChange={(v) => update({ place: v })}
                />
              </div>
              <TextField
                label="Fecha"
                value={item.date}
                onChange={(v) => update({ date: v })}
              />
              <TextAreaField
                label="Detalle"
                value={item.text}
                onChange={(v) => update({ text: v })}
                rows={2}
              />
              <TextField
                label="Enlace al certificado (opcional)"
                value={item.certificateUrl}
                onChange={(v) => update({ certificateUrl: v })}
                placeholder="https://…"
                hint="Si lo agregas, aparece un enlace “Ver certificado” en la tarjeta del curso."
              />
            </>
          )}
        />
      </Card>

      <Card title="Voluntariado">
        <TextField
          label="Título de la sección"
          value={content.volunteeringTitle}
          onChange={(v) => set("volunteeringTitle", v)}
        />
        <RepeatableList
          items={content.volunteering}
          onChange={(list) => set("volunteering", list)}
          template={{ id: "", title: "", place: "", date: "", text: "" }}
          makeItem={() => ({ id: newId(), title: "", place: "", date: "", text: "" })}
          addLabel="Añadir voluntariado"
          itemLabel={(i) => `Voluntariado ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Rol"
                  value={item.title}
                  onChange={(v) => update({ title: v })}
                />
                <TextField
                  label="Organización"
                  value={item.place}
                  onChange={(v) => update({ place: v })}
                />
              </div>
              <TextField
                label="Fecha"
                value={item.date}
                onChange={(v) => update({ date: v })}
              />
              <TextAreaField
                label="Detalle"
                value={item.text}
                onChange={(v) => update({ text: v })}
                rows={2}
              />
            </>
          )}
        />
      </Card>

      <Card title="Publicaciones (etiquetas)">
        <TextField
          label="Etiqueta en el menú"
          value={content.publicationsNav}
          onChange={(v) => set("publicationsNav", v)}
          hint="Texto del enlace en la navegación del CV."
        />
        <TextField
          label="Título de la página"
          value={content.publicationsTitle}
          onChange={(v) => set("publicationsTitle", v)}
        />
        <TextAreaField
          label="Introducción"
          value={content.publicationsIntro}
          onChange={(v) => set("publicationsIntro", v)}
          rows={2}
        />
        <TextField
          label="Mensaje cuando no hay publicaciones"
          value={content.publicationsEmpty}
          onChange={(v) => set("publicationsEmpty", v)}
        />
      </Card>

      <Card title="Contacto">
        <TextField
          label="Título"
          value={content.contactTitle}
          onChange={(v) => set("contactTitle", v)}
        />
        <TextAreaField
          label="Texto"
          value={content.contactText}
          onChange={(v) => set("contactText", v)}
        />
      </Card>

      <Card title="SEO (buscadores)">
        <TextField
          label="Título de la pestaña"
          value={content.metaTitle}
          onChange={(v) => set("metaTitle", v)}
        />
        <TextAreaField
          label="Descripción para buscadores"
          value={content.metaDescription}
          onChange={(v) => set("metaDescription", v)}
          rows={2}
        />
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared / general editor                                                    */
/* -------------------------------------------------------------------------- */

function GeneralEditor({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { shared } = data;

  const setShared = <K extends keyof typeof shared>(
    key: K,
    value: (typeof shared)[K],
  ) => onChange({ ...data, shared: { ...shared, [key]: value } });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImageAction(fd);
      if (res.error) setUploadError(res.error);
      else if (res.url) setShared("photoUrl", res.url);
    } catch {
      setUploadError(
        "No se pudo subir la imagen. Revisa que pese menos de 5 MB e inténtalo de nuevo.",
      );
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="grid gap-5">
      <Card title="Foto de perfil">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {shared.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview of uploaded image
            <img
              src={shared.photoUrl}
              alt="Vista previa"
              className="size-20 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/15"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-black/5 text-xs text-neutral-400 dark:bg-white/10">
              Sin foto
            </div>
          )}
          <div className="grid gap-2">
            <label className="cursor-pointer rounded-full bg-black px-4 py-2 text-sm font-semibold text-white transition hover:scale-[1.02] dark:bg-white dark:text-black">
              {uploading ? "Subiendo…" : "Subir imagen"}
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {shared.photoUrl && (
              <button
                type="button"
                onClick={() => setShared("photoUrl", "")}
                className="text-left text-sm font-medium text-red-500 hover:underline"
              >
                Quitar foto
              </button>
            )}
          </div>
        </div>
        {uploadError && (
          <p className="text-sm text-red-500">{uploadError}</p>
        )}
        <TextField
          label="Texto alternativo (accesibilidad)"
          value={shared.photoAlt}
          onChange={(v) => setShared("photoAlt", v)}
        />
      </Card>

      <Card title="Identidad">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            value={shared.name}
            onChange={(v) => setShared("name", v)}
          />
          <TextField
            label="Ubicación"
            value={shared.location}
            onChange={(v) => setShared("location", v)}
          />
        </div>
      </Card>

      <Card title="Contacto y enlaces">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Correo"
            value={shared.email}
            onChange={(v) => setShared("email", v)}
          />
          <TextField
            label="WhatsApp"
            value={shared.whatsapp}
            onChange={(v) => setShared("whatsapp", v)}
            hint="Número (ej.: 56912345678) o enlace completo."
          />
        </div>
        <TextField
          label="LinkedIn (URL)"
          value={shared.linkedin}
          onChange={(v) => setShared("linkedin", v)}
        />
      </Card>

      <Card title="Currículum (PDF)">
        <PdfUploadField
          label="CV en inglés"
          value={shared.cvEn}
          onChange={(v) => setShared("cvEn", v)}
          hint="Se descarga desde /cv. Al subir uno nuevo, el anterior se borra del almacenamiento."
        />
        <ToggleField
          label="Usar el CV en inglés para la versión en español"
          checked={shared.cvEsUseEn}
          onChange={(v) => setShared("cvEsUseEn", v)}
          hint="Activado: /cv-es redirige al CV en inglés. Apágalo cuando subas un CV en español."
        />
        <PdfUploadField
          label="CV en español"
          value={shared.cvEs}
          onChange={(v) => setShared("cvEs", v)}
          disabled={shared.cvEsUseEn}
          hint={
            shared.cvEsUseEn
              ? "Se usará el CV en inglés mientras el interruptor de arriba esté activado."
              : "Se descarga desde /cv-es. Al subir uno nuevo, el anterior se borra del almacenamiento."
          }
        />
      </Card>

      <Card title="Publicaciones (LinkedIn)">
        <p className="text-xs leading-5 text-neutral-400">
          Cada publicación aparece en la sección “Publications” de la página{" "}
          <a
            href="/en/more#publications"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            /en/more ↗
          </a>{" "}
          y enlaza al post original en LinkedIn. Ordénalas de más reciente a más
          antigua con las flechas. Puedes asociar cada post a una experiencia,
          educación, curso, voluntariado o proyecto (más abajo).
        </p>
        <RepeatableList
          items={shared.publications}
          onChange={(list) => setShared("publications", list)}
          template={{
            id: "",
            title: "",
            date: "",
            url: "",
            excerpt: "",
            imageUrl: "",
            anchorType: "" as AnchorType,
            anchorId: "",
          }}
          makeItem={() => ({
            id: newId(),
            title: "",
            date: "",
            url: "",
            excerpt: "",
            imageUrl: "",
            anchorType: "" as AnchorType,
            anchorId: "",
          })}
          addLabel="Añadir publicación"
          itemLabel={(i) => `Publicación ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <TextField
                label="Título"
                value={item.title}
                onChange={(v) => update({ title: v })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Fecha"
                  value={item.date}
                  onChange={(v) => update({ date: v })}
                  placeholder="Ej.: Mar 2026"
                />
                <TextField
                  label="Enlace al post (URL)"
                  value={item.url}
                  onChange={(v) => update({ url: v })}
                  placeholder="https://www.linkedin.com/posts/…"
                />
              </div>
              <TextAreaField
                label="Resumen"
                value={item.excerpt}
                onChange={(v) => update({ excerpt: v })}
              />
              <ImageInputField
                label="Imagen (opcional)"
                value={item.imageUrl}
                onChange={(v) => update({ imageUrl: v })}
                hint="Pega el enlace de una imagen o súbela. Déjalo vacío para una tarjeta solo de texto."
              />
              <AnchorSelect
                data={data}
                item={item}
                includeProjects
                onChange={(anchorType, anchorId) =>
                  update({ anchorType, anchorId })
                }
                hint="Opcional. Si la asocias, el post aparece como etiqueta en esa experiencia, educación, curso, voluntariado o proyecto (según el contenido en inglés)."
              />
            </>
          )}
        />
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Projects editor (English-only)                                             */
/* -------------------------------------------------------------------------- */

function ProjectsEditor({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
}) {
  const projects = data.projects ?? [];

  const template: ProjectPost = {
    slug: "",
    title: "",
    date: "",
    summary: "",
    body: "",
    experienceId: "",
    anchorType: "",
    anchorId: "",
    coverImage: "",
    coverFit: "contain",
    gallery: [],
    links: [],
  };

  return (
    <div className="grid gap-5">
      <Card title="Proyectos (solo inglés)">
        <p className="text-xs leading-5 text-neutral-400">
          Cada proyecto se publica como una página propia y se lista en{" "}
          <a
            href="/en/more#projects"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            /en/more ↗
          </a>{" "}
          y puede asociarse a una experiencia, educación, curso o voluntariado.
          El contenido va en inglés. El enlace “More” del menú aparece cuando hay
          al menos un proyecto o una publicación.
        </p>
        <RepeatableList
          items={projects}
          onChange={(list) => onChange({ ...data, projects: list })}
          template={template}
          addLabel="Añadir proyecto"
          itemLabel={(i) => `Proyecto ${i + 1}`}
          renderItem={(item, update) => (
            <>
              <TextField
                label="Título"
                value={item.title}
                onChange={(v) =>
                  update(item.slug ? { title: v } : { title: v, slug: slugify(v) })
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  label="Slug (URL)"
                  value={item.slug}
                  onChange={(v) => update({ slug: v })}
                  hint={`Dirección: /en/projects/${item.slug || "…"}`}
                />
                <TextField
                  label="Fecha"
                  value={item.date}
                  onChange={(v) => update({ date: v })}
                  placeholder="Ej.: Mar 2026"
                />
              </div>
              <AnchorSelect
                data={data}
                item={item}
                onChange={(anchorType, anchorId) =>
                  update({
                    anchorType,
                    anchorId,
                    experienceId: anchorType === "experience" ? anchorId : "",
                  })
                }
                hint="Se mostrará como enlace dentro de ese elemento del CV (experiencia, educación, curso o voluntariado)."
              />
              <TextAreaField
                label="Resumen"
                value={item.summary}
                onChange={(v) => update({ summary: v })}
                rows={2}
              />
              <ImageUploadField
                label="Imagen de portada (opcional)"
                value={item.coverImage}
                onChange={(v) => update({ coverImage: v })}
                fit={item.coverFit}
                onFitChange={(v) => update({ coverFit: v })}
              />
              <TextAreaField
                label="Contenido (Markdown)"
                value={item.body}
                onChange={(v) => update({ body: v })}
                rows={10}
              />
              <p className="-mt-2 text-xs leading-5 text-neutral-400">
                Admite Markdown: <code># Título</code>, <code>**negrita**</code>,{" "}
                <code>- listas</code> y <code>[enlace](https://…)</code>.
              </p>
              <div>
                <span className="text-sm font-medium">Más imágenes (opcional)</span>
                <p className="mt-1 text-xs leading-5 text-neutral-400">
                  Se muestran al final de la página del proyecto, a su tamaño
                  real y sin recortar. Puedes reordenarlas con ↑ ↓.
                </p>
                <div className="mt-2">
                  <RepeatableList
                    items={item.gallery ?? []}
                    onChange={(list) => update({ gallery: list })}
                    template={{ url: "", caption: "" }}
                    addLabel="Añadir imagen"
                    itemLabel={(i) => `Imagen ${i + 1}`}
                    renderItem={(img, updateImg) => (
                      <>
                        <ImageUploadField
                          label="Imagen"
                          value={img.url}
                          onChange={(v) => updateImg({ url: v })}
                        />
                        <TextField
                          label="Pie de foto (opcional)"
                          value={img.caption}
                          onChange={(v) => updateImg({ caption: v })}
                        />
                      </>
                    )}
                  />
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">Enlaces (opcional)</span>
                <div className="mt-2">
                  <RepeatableList
                    items={item.links}
                    onChange={(list) => update({ links: list })}
                    template={{ label: "", url: "" }}
                    addLabel="Añadir enlace"
                    itemLabel={(i) => `Enlace ${i + 1}`}
                    renderItem={(link, updateLink) => (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TextField
                          label="Texto"
                          value={link.label}
                          onChange={(v) => updateLink({ label: v })}
                        />
                        <TextField
                          label="URL"
                          value={link.url}
                          onChange={(v) => updateLink({ url: v })}
                          placeholder="https://…"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            </>
          )}
        />
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main editor shell                                                          */
/* -------------------------------------------------------------------------- */

export default function AdminEditor({
  initialData,
  email,
  mode,
}: {
  initialData: ResumeData;
  email: string;
  mode: "blob" | "file";
}) {
  const [data, setData] = useState<ResumeData>(() => structuredClone(initialData));
  const [tab, setTab] = useState<Tab>("general");
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function update(next: ResumeData) {
    setData(next);
    setDirty(true);
    setSavedAt(null);
  }

  function setLang(lang: Lang, content: LangContent) {
    update({ ...data, [lang]: content });
  }

  function save() {
    setSaveError(null);
    startTransition(async () => {
      const res = await saveContentAction(data);
      if (res.ok) {
        setDirty(false);
        setSavedAt(res.savedAt ?? Date.now());
      } else {
        setSaveError(res.error ?? "No se pudo guardar.");
      }
    });
  }

  /** Copy the whole English CV as an AI-ready Markdown document. */
  async function copyMarkdown() {
    const markdown = resumeToMarkdown(data);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // Fallback for browsers/contexts without the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = markdown;
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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "General" },
    { key: "projects", label: "Projects" },
    { key: "en", label: "English" },
    { key: "es", label: "Español" },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Editor del currículum</h1>
            <p className="truncate text-xs text-neutral-400">
              {email} ·{" "}
              {mode === "blob" ? "Vercel Blob" : "Archivo local (dev)"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {dirty && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Sin guardar
              </span>
            )}
            {savedAt && !dirty && (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Guardado ✓
              </span>
            )}
            <button
              type="button"
              onClick={copyMarkdown}
              title="Copia todo tu CV en inglés como Markdown, listo para pegar en una IA."
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                copied
                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              {copied ? "Copiado ✓" : "Copiar Markdown (IA)"}
            </button>
            <Link
              href="/admin/share"
              title="Enlaces y QR con etiqueta para cada canal."
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Compartir
            </Link>
            <Link
              href="/admin/stats"
              title="Visitas, descargas del CV y clics de contacto."
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Métricas
            </Link>
            <a
              href="/en"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Ver EN ↗
            </a>
            <a
              href="/es"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Ver ES ↗
            </a>
            <button
              type="button"
              onClick={save}
              disabled={isPending || !dirty}
              className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.03] disabled:opacity-50 dark:bg-white dark:text-black"
            >
              {isPending ? "Guardando…" : "Guardar cambios"}
            </button>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-neutral-500 dark:border-white/15"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-4xl gap-1 px-4 pb-2">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              type="button"
              onClick={() => setTab(tb.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === tb.key
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {saveError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
            {saveError}
          </p>
        )}

        {tab === "general" && <GeneralEditor data={data} onChange={update} />}
        {tab === "projects" && <ProjectsEditor data={data} onChange={update} />}
        {tab === "en" && (
          <LangEditor
            content={data.en}
            onChange={(c) => setLang("en", c)}
            data={data}
          />
        )}
        {tab === "es" && (
          <LangEditor
            content={data.es}
            onChange={(c) => setLang("es", c)}
            data={data}
          />
        )}

        {/* Sticky save on mobile */}
        <div className="sticky bottom-4 mt-8 flex justify-end md:hidden">
          <button
            type="button"
            onClick={save}
            disabled={isPending || !dirty}
            className="rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isPending ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </main>
    </div>
  );
}
