"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkStorageAction, resetStatsAction } from "@/app/admin/actions";
import type { PublicAnalytics, RecentHit } from "@/lib/analytics-types";

/**
 * Visit dashboard for `/admin/stats`.
 *
 * Receives the whole (small) pre-aggregated dataset and slices it in the
 * browser, so switching range is instant and no extra request is needed.
 * Timestamps arrive pre-formatted from the server to keep rendering
 * deterministic between server and client.
 */

export type RecentRow = RecentHit & { when: string };

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

/* Data colour: blue from the validated data-viz palette — `#2a78d6` on light
   surfaces, its dark-surface step `#3987e5`. Single series, so no legend. */
const BAR = "bg-[#2a78d6] dark:bg-[#3987e5]";
const WASH = "bg-[#2a78d6]/12 dark:bg-[#3987e5]/25";

const CARD =
  "rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-white/[0.06] dark:ring-white/10";

const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

const numberFmt = new Intl.NumberFormat("es-ES");

/** `2026-08-11` → `11 ago`. Parsed from the string: no timezone maths. */
function dayLabel(key: string): string {
  const [, month, day] = key.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}`.trim();
}

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

type Buckets = Record<string, number>;

interface Totals {
  views: number;
  visitors: number;
  pages: Buckets;
  sources: Buckets;
  countries: Buckets;
  devices: Buckets;
  events: Buckets;
}

function emptyTotals(): Totals {
  return {
    views: 0,
    visitors: 0,
    pages: {},
    sources: {},
    countries: {},
    devices: {},
    events: {},
  };
}

function addInto(target: Buckets, source: Buckets | undefined): void {
  for (const [key, value] of Object.entries(source ?? {})) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function aggregate(days: PublicAnalytics["days"], keys: string[]): Totals {
  const totals = emptyTotals();
  for (const key of keys) {
    const day = days[key];
    if (!day) continue;
    totals.views += day.views ?? 0;
    totals.visitors += day.visitors ?? 0;
    addInto(totals.pages, day.pages);
    addInto(totals.sources, day.sources);
    addInto(totals.countries, day.countries);
    addInto(totals.devices, day.devices);
    addInto(totals.events, day.events);
  }
  return totals;
}

function sumWhere(events: Buckets, test: (name: string) => boolean): number {
  let total = 0;
  for (const [name, value] of Object.entries(events)) {
    if (test(name)) total += value;
  }
  return total;
}

function ranked(buckets: Buckets, limit = 8): { key: string; value: number }[] {
  return Object.entries(buckets)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/* -------------------------------------------------------------------------- */
/* Labels                                                                     */
/* -------------------------------------------------------------------------- */

const EVENT_LABELS: Record<string, string> = {
  "cv:en": "Descarga del CV (EN)",
  "cv:es": "Descarga del CV (ES)",
  "contact:whatsapp": "Clic en WhatsApp",
  "contact:email": "Clic en el correo",
  "contact:linkedin": "Clic en LinkedIn",
  "contact:github": "Clic en GitHub",
  "contact:phone": "Clic en el teléfono",
  "publication:open": "Abrió una publicación",
};

function eventLabel(name: string): string {
  if (EVENT_LABELS[name]) return EVENT_LABELS[name];
  if (name.startsWith("out:")) return `Enlace externo · ${name.slice(4)}`;
  return name;
}

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Escritorio",
  mobile: "Móvil",
  tablet: "Tablet",
};

const SOURCE_LABELS: Record<string, string> = {
  direct: "Directo (enlace o QR sin etiqueta)",
};

/** Shorter form of the same label, for the narrow column in the feed. */
function shortSource(src: string): string {
  return src === "direct" ? "Directo" : src;
}

const DWELL_LABELS: [string, string][] = [
  ["dwell:0-10", "Menos de 10 s"],
  ["dwell:10-30", "10 – 30 s"],
  ["dwell:30-60", "30 – 60 s"],
  ["dwell:60plus", "Más de 1 min"],
];

const SCROLL_LABELS: [string, string][] = [
  ["scroll:0", "Solo el inicio"],
  ["scroll:25", "25 % de la página"],
  ["scroll:50", "50 %"],
  ["scroll:75", "75 %"],
  ["scroll:100", "Hasta el final"],
];

/** `ES` → 🇪🇸, built from the two regional-indicator code points. */
function flag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)),
  );
}

function countryLabel(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "🌐 Desconocido";
  let name = code.toUpperCase();
  try {
    const display = new Intl.DisplayNames(["es"], { type: "region" });
    name = display.of(code.toUpperCase()) ?? name;
  } catch {
    // Older runtimes: the code alone is fine.
  }
  return `${flag(code)} ${name}`;
}

/* -------------------------------------------------------------------------- */
/* Pieces                                                                     */
/* -------------------------------------------------------------------------- */

function StatTile({
  label,
  value,
  previous,
  hint,
}: {
  label: string;
  value: number;
  previous: number;
  hint?: string;
}) {
  const delta = value - previous;
  const pct = previous > 0 ? Math.round((delta / previous) * 100) : null;
  return (
    <div className={CARD}>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight">
        {numberFmt.format(value)}
      </p>
      <p className="mt-1 text-xs">
        {delta === 0 ? (
          <span className="text-neutral-400">Igual que el período anterior</span>
        ) : (
          <span
            className={
              delta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }
          >
            {delta > 0 ? "▲" : "▼"} {numberFmt.format(Math.abs(delta))}
            {pct !== null ? ` (${Math.abs(pct)} %)` : ""}{" "}
            <span className="text-neutral-400">vs. período anterior</span>
          </span>
        )}
      </p>
      {hint && (
        <p className="mt-2 text-[11px] leading-snug text-neutral-400">{hint}</p>
      )}
    </div>
  );
}

function DailyChart({
  keys,
  days,
}: {
  keys: string[];
  days: PublicAnalytics["days"];
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = keys.map((key) => days[key]?.views ?? 0);
  const max = Math.max(1, ...values);
  const peakIndex = values.indexOf(Math.max(...values));
  const active = hovered ?? (max > 1 ? peakIndex : null);

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">Visitas por día</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {active !== null && values[active] > 0 ? (
            <>
              <span className="font-medium text-neutral-700 dark:text-neutral-200">
                {dayLabel(keys[active])}
              </span>{" "}
              · {numberFmt.format(values[active])}{" "}
              {values[active] === 1 ? "visita" : "visitas"}
              {hovered === null && " (máximo)"}
            </>
          ) : (
            "Sin visitas en este período"
          )}
        </p>
      </div>

      <div
        className="mt-4 flex h-40 items-end gap-[2px]"
        onMouseLeave={() => setHovered(null)}
      >
        {keys.map((key, i) => {
          const value = values[i];
          const height = value > 0 ? Math.max(3, (value / max) * 100) : 2;
          return (
            <div
              key={key}
              onMouseEnter={() => setHovered(i)}
              title={`${dayLabel(key)} · ${value} ${value === 1 ? "visita" : "visitas"}`}
              className="flex h-full flex-1 cursor-default items-end"
            >
              <div
                style={{ height: `${height}%` }}
                className={`w-full rounded-t-[4px] transition-opacity ${
                  value > 0
                    ? `${BAR} ${hovered !== null && hovered !== i ? "opacity-45" : ""}`
                    : "bg-black/8 dark:bg-white/12"
                }`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-[11px] text-neutral-400 dark:border-white/10">
        <span>{dayLabel(keys[0])}</span>
        <span>Hoy</span>
      </div>
    </section>
  );
}

function RankedList({
  title,
  rows,
  empty,
  label = (key: string) => key,
}: {
  title: string;
  rows: { key: string; value: number }[];
  empty: string;
  label?: (key: string) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className={CARD}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-400">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map((row) => (
            <li key={row.key} className="relative">
              <div
                aria-hidden
                style={{ width: `${(row.value / max) * 100}%` }}
                className={`absolute inset-y-0 left-0 rounded-lg ${WASH}`}
              />
              <div className="relative flex items-center justify-between gap-3 px-2.5 py-1.5 text-sm">
                <span className="truncate" title={row.key}>
                  {label(row.key)}
                </span>
                <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                  {numberFmt.format(row.value)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Fixed-order distribution (scroll depth, time on page). */
function Distribution({
  title,
  subtitle,
  entries,
  events,
}: {
  title: string;
  subtitle: string;
  entries: [string, string][];
  events: Buckets;
}) {
  const rows = entries.map(([key, label]) => ({
    label,
    value: events[key] ?? 0,
  }));
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  return (
    <section className={CARD}>
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        {subtitle}
      </p>
      {total === 0 ? (
        <p className="mt-3 text-xs text-neutral-400">Sin datos todavía.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const pct = Math.round((row.value / total) * 100);
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate">{row.label}</span>
                  <span className="tabular-nums text-neutral-500 dark:text-neutral-400">
                    {pct} %
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-black/5 dark:bg-white/10">
                  <div
                    style={{ width: `${pct}%` }}
                    className={`h-full rounded-full ${BAR}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentTable({ rows }: { rows: RecentRow[] }) {
  return (
    <section className={CARD}>
      <h2 className="text-sm font-semibold">Actividad reciente</h2>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        Las últimas {rows.length} visitas y acciones, de la más nueva a la más
        antigua.
      </p>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-400">Sin actividad todavía.</p>
      ) : (
        <div className="mt-3 -mx-1 overflow-x-auto">
          <table className="w-full min-w-[540px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-neutral-400">
              <tr>
                <th className="px-1 py-1.5 font-medium">Cuándo</th>
                <th className="px-1 py-1.5 font-medium">Qué</th>
                <th className="px-1 py-1.5 font-medium">Desde</th>
                <th className="px-1 py-1.5 font-medium">Origen</th>
                <th className="px-1 py-1.5 font-medium">Dispositivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/10">
              {rows.map((row, i) => (
                <tr key={`${row.t}-${i}`}>
                  <td className="whitespace-nowrap px-1 py-2 tabular-nums text-neutral-500 dark:text-neutral-400">
                    {row.when}
                  </td>
                  <td className="px-1 py-2">
                    {row.event === "view" ? (
                      <span className="font-medium">{row.path}</span>
                    ) : (
                      <span className="rounded-full bg-[#2a78d6]/12 px-2 py-0.5 text-xs font-medium dark:bg-[#3987e5]/25">
                        {eventLabel(row.event)}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-1 py-2 text-neutral-500 dark:text-neutral-400">
                    {flag(row.country)} {row.city || row.country}
                  </td>
                  <td className="px-1 py-2 text-neutral-500 dark:text-neutral-400">
                    {shortSource(row.src)}
                  </td>
                  <td className="whitespace-nowrap px-1 py-2 text-neutral-500 dark:text-neutral-400">
                    {DEVICE_LABELS[row.device] ?? row.device}
                    {row.browser !== "unknown" ? ` · ${row.browser}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export default function StatsDashboard({
  analytics,
  dayKeys,
  recent,
  updatedAt,
  email,
  mode,
}: {
  analytics: PublicAnalytics;
  /** Day keys, oldest → newest, ending today. */
  dayKeys: string[];
  recent: RecentRow[];
  updatedAt: string;
  email: string;
  mode: "supabase" | "file";
}) {
  const [range, setRange] = useState<Range>(30);
  const [isPending, startTransition] = useTransition();
  const [storageCheck, setStorageCheck] = useState<{
    ok: boolean;
    detail: string;
  } | null>(null);
  const router = useRouter();

  const { keys, current, previous } = useMemo(() => {
    const keys = dayKeys.slice(-range);
    const previousKeys = dayKeys.slice(-range * 2, -range);
    return {
      keys,
      current: aggregate(analytics.days, keys),
      previous: aggregate(analytics.days, previousKeys),
    };
  }, [analytics.days, dayKeys, range]);

  const isCv = (name: string) => name.startsWith("cv:");
  const isContact = (name: string) => name.startsWith("contact:");
  const isTracked = (name: string) =>
    !name.startsWith("scroll:") && !name.startsWith("dwell:");

  const cvNow = sumWhere(current.events, isCv);
  const cvBefore = sumWhere(previous.events, isCv);
  const contactNow = sumWhere(current.events, isContact);
  const contactBefore = sumWhere(previous.events, isContact);

  const actionRows = ranked(
    Object.fromEntries(
      Object.entries(current.events).filter(([name]) => isTracked(name)),
    ),
  );

  const hasData = current.views > 0 || actionRows.length > 0;

  const checkStorage = () => {
    setStorageCheck(null);
    startTransition(async () => {
      setStorageCheck(await checkStorageAction());
    });
  };

  const reset = () => {
    if (
      !window.confirm(
        "¿Borrar todas las métricas guardadas? Esta acción no se puede deshacer.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      await resetStatsAction();
      router.refresh();
    });
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] dark:bg-[#050505] dark:text-white">
      <header className="sticky top-0 z-40 border-b border-black/5 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-black/70">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Métricas del sitio</h1>
            <p className="truncate text-xs text-neutral-400">
              {email} · {mode === "supabase" ? "Supabase" : "Archivo local (dev)"}
              {updatedAt ? ` · actualizado ${updatedAt}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/share"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Compartir
            </Link>
            <a
              href="https://vercel.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold dark:border-white/15"
            >
              Vercel Analytics ↗
            </a>
            <Link
              href="/admin"
              className="rounded-full bg-black px-4 py-1.5 text-xs font-semibold text-white transition hover:scale-[1.03] dark:bg-white dark:text-black"
            >
              ← Volver al editor
            </Link>
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl gap-1 px-4 pb-2">
          {RANGES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                range === value
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-neutral-500 hover:bg-black/5 dark:hover:bg-white/10"
              }`}
            >
              {value} días
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {!hasData && (
          <section className={CARD}>
            <h2 className="text-sm font-semibold">Todavía no hay datos</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Las visitas se registran desde ahora. Tus propias visitas
              <strong> no cuentan</strong> mientras tengas la sesión de{" "}
              <code>/admin</code> abierta en este navegador — para probarlo, abre
              el sitio en una ventana de incógnito.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              Para saber por dónde llegó cada persona, comparte enlaces
              etiquetados:{" "}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">
                ?src=linkedin
              </code>{" "}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">
                ?src=qr
              </code>{" "}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">
                ?src=santander
              </code>
            </p>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Visitas"
            value={current.views}
            previous={previous.views}
          />
          <StatTile
            label="Visitantes únicos"
            value={current.visitors}
            previous={previous.visitors}
            hint="Suma de únicos por día: quien vuelve otro día cuenta de nuevo."
          />
          <StatTile
            label="Descargas del CV"
            value={cvNow}
            previous={cvBefore}
            hint="Contadas en el servidor, no las oculta un bloqueador."
          />
          <StatTile
            label="Clics de contacto"
            value={contactNow}
            previous={contactBefore}
            hint="WhatsApp, correo, LinkedIn."
          />
        </div>

        <DailyChart keys={keys} days={analytics.days} />

        <div className="grid gap-4 md:grid-cols-2">
          <RankedList
            title="Origen de las visitas"
            rows={ranked(current.sources)}
            empty="Sin visitas en este período."
            label={(key) => SOURCE_LABELS[key] ?? key}
          />
          <RankedList
            title="Páginas más vistas"
            rows={ranked(current.pages)}
            empty="Sin visitas en este período."
          />
          <RankedList
            title="Países"
            rows={ranked(current.countries)}
            empty="Sin datos de ubicación (solo llegan en producción)."
            label={countryLabel}
          />
          <RankedList
            title="Acciones"
            rows={actionRows}
            empty="Nadie ha descargado el CV ni pulsado contacto todavía."
            label={eventLabel}
          />
          <Distribution
            title="Hasta dónde leen"
            subtitle="Punto más bajo alcanzado antes de irse."
            entries={SCROLL_LABELS}
            events={current.events}
          />
          <Distribution
            title="Tiempo en la página"
            subtitle="Cuánto se quedan en cada visita."
            entries={DWELL_LABELS}
            events={current.events}
          />
          <RankedList
            title="Dispositivos"
            rows={ranked(current.devices)}
            empty="Sin visitas en este período."
            label={(key) => DEVICE_LABELS[key] ?? key}
          />
        </div>

        <RecentTable rows={recent} />

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Cómo se recogen estos datos</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            <li>
              • <strong>Sin cookies</strong> y sin identificadores persistentes:
              cada visitante se cuenta con un hash del día que no permite
              seguirlo de una jornada a otra. Por eso el sitio no necesita banner
              de consentimiento.
            </li>
            <li>
              • No se guarda ninguna IP. El país y la ciudad los aporta Vercel a
              partir de la red, solo en producción.
            </li>
            <li>
              • Tus propias visitas se descartan mientras tengas sesión de admin;
              los bots también.
            </li>
            <li>
              • Etiqueta los enlaces que compartas con{" "}
              <code className="rounded bg-black/5 px-1 dark:bg-white/10">
                ?src=loquesea
              </code>{" "}
              y aparecerá en «Origen de las visitas».
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={checkStorage}
              disabled={isPending}
              className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold transition hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
            >
              {isPending ? "Comprobando…" : "Comprobar almacenamiento"}
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="rounded-full border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-50 dark:text-rose-400"
            >
              {isPending ? "Borrando…" : "Borrar todas las métricas"}
            </button>
          </div>
          {storageCheck && (
            <p
              className={`mt-2 text-xs ${
                storageCheck.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {storageCheck.ok ? "✓ " : "✕ "}
              {storageCheck.detail}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
