"use client";

import { useState, useTransition } from "react";
import {
  logoutAction,
  saveContentAction,
  uploadImageAction,
} from "@/app/admin/actions";
import type { Lang, LangContent, ResumeData } from "@/lib/resume-content";

type Tab = "general" | "en" | "es";

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
  addLabel,
  itemLabel,
  renderItem,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  template: T;
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
        onClick={() => onChange([...items, structuredClone(template)])}
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
}: {
  content: LangContent;
  onChange: (next: LangContent) => void;
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
          template={{ role: "", place: "", date: "", text: "" }}
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
          template={{ title: "", place: "", date: "", text: "" }}
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
        <TextField
          label="CV en inglés (URL)"
          value={shared.cvEn}
          onChange={(v) => setShared("cvEn", v)}
          hint="Ruta o enlace al PDF que se descarga en la versión en inglés."
        />
        <TextField
          label="CV en español (URL)"
          value={shared.cvEs}
          onChange={(v) => setShared("cvEs", v)}
          hint="Ruta o enlace al PDF que se descarga en la versión en español."
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

  const tabs: { key: Tab; label: string }[] = [
    { key: "general", label: "General" },
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
        {tab === "en" && (
          <LangEditor content={data.en} onChange={(c) => setLang("en", c)} />
        )}
        {tab === "es" && (
          <LangEditor content={data.es} onChange={(c) => setLang("es", c)} />
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
