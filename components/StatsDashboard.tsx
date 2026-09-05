"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkStorageAction,
  resetStatsAction,
  setOptOutAction,
} from "@/app/admin/actions";
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

/** One thing that happened during a visit: a page opened or an action taken. */
export interface VisitEntryRow {
  /** Epoch ms, for ordering only. */
  t: number;
  /** Pre-formatted clock time, e.g. `14:32`. */
  at: string;
  kind: "page" | "action";
  /** The path for a page, the event name for an action. */
  value: string;
  /** Seconds on the page; `null` when the visitor never reported leaving it. */
  seconds: number | null;
  /** Deepest scroll percentage on the page, or `null`. */
  depth: number | null;
}

/** One session, already formatted by `app/admin/stats/page.tsx`. */
export interface VisitRow {
  key: string;
  /** `YYYY-MM-DD`, used to filter by the selected range. */
  dayKey: string;
  /** `Hoy`, `Ayer` or `3 sept`. */
  day: string;
  /** 1, 2, 3… in order of first appearance that day. */
  visitor: number;
  started: string;
  /** Time actually measured across the visit's pages. */
  seconds: number;
  /** True when a page's time is missing, so `seconds` is a floor. */
  partial: boolean;
  src: string;
  country: string;
  city: string;
  device: string;
  browser: string;
  entries: VisitEntryRow[];
}

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
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

/** `95` → `1 min 35 s`. Round numbers drop the smaller unit. */
function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;
  if (minutes < 60) {
    return restSeconds ? `${minutes} min ${restSeconds} s` : `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return restMinutes ? `${hours} h ${restMinutes} min` : `${hours} h`;
}

const CHIP =
  "rounded-full bg-[#2a78d6]/12 px-2 py-0.5 text-xs font-medium dark:bg-[#3987e5]/25";

/** `🇪🇸 Madrid`, or nothing at all when the network told us nothing. */
function place(country: string, city: string): string {
  const known = /^[A-Za-z]{2}$/.test(country);
  if (city) return known ? `${flag(country)} ${city}` : city;
  return known ? `${flag(country)} ${country.toUpperCase()}` : "";
}

/** One collapsed session; opening it reveals the whole path through the site. */
function VisitCard({ visit, repeat }: { visit: VisitRow; repeat: boolean }) {
  const [open, setOpen] = useState(false);
  const pages = visit.entries.filter((entry) => entry.kind === "page").length;
  const actions = visit.entries.filter((entry) => entry.kind === "action");
  const summary = [
    `${pages} ${pages === 1 ? "página" : "páginas"}`,
    visit.seconds > 0
      ? `${duration(visit.seconds)}${visit.partial ? "+" : ""}`
      : "tiempo sin medir",
    place(visit.country, visit.city),
    shortSource(visit.src),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
      >
        <span
          aria-hidden
          className={`mt-0.5 text-neutral-400 transition-transform ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium">Visitante {visit.visitor}</span>
            {repeat && (
              <span className="rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:bg-white/10 dark:text-neutral-300">
                vuelve
              </span>
            )}
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {visit.day} · {visit.started}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-neutral-500 dark:text-neutral-400">
            {summary}
          </span>
        </span>
        {actions.length > 0 && (
          <span className={`shrink-0 ${CHIP}`}>
            {actions.length} {actions.length === 1 ? "acción" : "acciones"}
          </span>
        )}
      </button>

      {open && (
        <div className="border-t border-black/5 dark:border-white/10">
          <ol className="space-y-1.5 px-3 py-2.5">
            {visit.entries.map((entry, i) => (
              <li
                key={`${entry.t}-${i}`}
                className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
              >
                <span className="w-10 shrink-0 tabular-nums text-xs text-neutral-400">
                  {entry.at}
                </span>
                {entry.kind === "page" ? (
                  <>
                    <span className="font-medium">{entry.value}</span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {entry.seconds !== null
                        ? duration(entry.seconds)
                        : "sin medir"}
                      {entry.depth !== null ? ` · leyó ${entry.depth} %` : ""}
                    </span>
                  </>
                ) : (
                  <span className={CHIP}>{eventLabel(entry.value)}</span>
                )}
              </li>
            ))}
          </ol>
          <p className="border-t border-black/5 px-3 py-2 text-[11px] text-neutral-400 dark:border-white/10">
            {countryLabel(visit.country)}
            {visit.city ? ` · ${visit.city}` : ""} ·{" "}
            {DEVICE_LABELS[visit.device] ?? visit.device}
            {visit.browser !== "unknown" ? ` · ${visit.browser}` : ""} · Origen:{" "}
            {SOURCE_LABELS[visit.src] ?? visit.src}
          </p>
        </div>
      )}
    </li>
  );
}

function VisitsFeed({ visits }: { visits: VisitRow[] }) {
  // Two sessions with the same number on the same day: the person came back.
  const repeats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const visit of visits) {
      const key = `${visit.dayKey}-${visit.visitor}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [visits]);

  return (
    <section className={CARD}>
      <h2 className="text-sm font-semibold">Actividad reciente</h2>
      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
        Cada línea es una visita entera. Ábrela para ver por qué páginas pasó, en
        qué orden, cuánto se quedó en cada una y qué pulsó.
      </p>
      {visits.length === 0 ? (
        <p className="mt-3 text-xs text-neutral-400">
          Sin visitas en este período.
        </p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {visits.map((visit) => (
            <VisitCard
              key={visit.key}
              visit={visit}
              repeat={(repeats.get(`${visit.dayKey}-${visit.visitor}`) ?? 0) > 1}
            />
          ))}
        </ul>
      )}
      <p className="mt-3 text-[11px] leading-snug text-neutral-400">
        La numeración vale solo dentro de su día: «Visitante 3» del martes y del
        miércoles no son la misma persona. Una pausa de 30 minutos abre una
        visita nueva, y el detalle se guarda 14 días.
      </p>
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
  visits,
  optedOut,
  updatedAt,
  email,
  mode,
}: {
  analytics: PublicAnalytics;
  /** Day keys, oldest → newest, ending today. */
  dayKeys: string[];
  recent: RecentRow[];
  /** Sessions, newest first. Empty for data stored before they existed. */
  visits: VisitRow[];
  /** Whether this browser carries the "don't count me" cookie. */
  optedOut: boolean;
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
  const [ignored, setIgnored] = useState(optedOut);
  const [optOutError, setOptOutError] = useState("");
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

  // Sessions live for a fortnight, so a 90-day range simply shows all of them.
  const visitsInRange = useMemo(
    () => visits.filter((visit) => visit.dayKey >= keys[0]),
    [visits, keys],
  );

  const checkStorage = () => {
    setStorageCheck(null);
    startTransition(async () => {
      setStorageCheck(await checkStorageAction());
    });
  };

  const toggleOptOut = () => {
    const next = !ignored;
    setOptOutError("");
    startTransition(async () => {
      const result = await setOptOutAction(next);
      if (result.ok) setIgnored(next);
      else setOptOutError(result.error ?? "No se pudo guardar la preferencia.");
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
              <code>/admin</code> abierta en este navegador, y puedes excluirlo
              para siempre con el botón de más abajo — para probar el contador,
              abre el sitio en una ventana de incógnito.
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

        {visits.length > 0 ? (
          <VisitsFeed visits={visitsInRange} />
        ) : (
          // Data stored before sessions existed still has the flat feed.
          <RecentTable rows={recent} />
        )}

        <section className={CARD}>
          <h2 className="text-sm font-semibold">Cómo se recogen estos datos</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
            <li>
              • Cada visita reciente se guarda como una <strong>sesión</strong>:
              las páginas por las que pasó esa persona, en orden, con el tiempo
              en cada una. Se conserva 14 días; los totales, un año.
            </li>
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
              • Tus propias visitas se descartan mientras tengas sesión de admin,
              y de forma permanente en los navegadores que excluyas aquí abajo.
              Los bots tampoco cuentan.
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
              onClick={toggleOptOut}
              disabled={isPending}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                ignored
                  ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-black"
                  : "border border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              }`}
            >
              {ignored
                ? "✓ Este dispositivo no se cuenta"
                : "No contar mis visitas desde este dispositivo"}
            </button>
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
          <p className="mt-2 text-[11px] leading-snug text-neutral-400">
            {ignored
              ? "Este navegador queda fuera de las métricas durante un año, incluidas las descargas del CV. Repítelo en el móvil y en cualquier otro navegador que uses."
              : "Deja una cookie de un año en este navegador; el servidor la respeta en todas las páginas y descargas, aunque caduque tu sesión de admin. Hazlo también desde el móvil."}
          </p>
          {optOutError && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
              {optOutError}
            </p>
          )}
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
