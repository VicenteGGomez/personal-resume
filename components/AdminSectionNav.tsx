"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { slugify } from "@/lib/slug";

/**
 * Left-hand block navigation for the admin editor.
 *
 * The editor is one long column of cards ("Destacados", "Experiencia",
 * "Contacto y enlaces"…), so getting from one to another meant scrolling past
 * everything in between. The rail lists the cards of the active tab, scrolls to
 * the one you pick and highlights the one you are looking at.
 *
 * The list is read from the DOM (`[data-admin-block]`, stamped by `Card`)
 * rather than declared here: adding or renaming a card in the editor then
 * updates the rail on its own, with no second list to keep in step — a label
 * and its anchor can never drift apart because they are the same string.
 */

export type AdminBlock = { id: string; label: string };

/** DOM id for a card, from its title. Titles are unique inside a tab. */
export function blockId(title: string): string {
  return `block-${slugify(title) || "seccion"}`;
}

/* -------------------------------------------------------------------------- */
/* The cards on the page, as an external store                                */
/* -------------------------------------------------------------------------- */

const NONE: AdminBlock[] = [];
let cached: AdminBlock[] = NONE;
let cachedKey = "";

/**
 * The cards currently in the document, in document order. `useSyncExternalStore`
 * compares snapshots by identity, so the same array comes back until the cards
 * themselves change — every other DOM mutation (and there is one per keystroke
 * in a list) costs one query and no render.
 */
function readBlocks(): AdminBlock[] {
  const found = Array.from(
    document.querySelectorAll<HTMLElement>("[data-admin-block]"),
  ).map((el) => ({ id: el.id, label: el.dataset.adminBlock ?? "" }));
  const key = found.map((b) => `${b.id}|${b.label}`).join("\n");
  if (key !== cachedKey) {
    cachedKey = key;
    cached = found;
  }
  return cached;
}

/** Nothing to list before hydration: the cards are not in the DOM yet. */
function noBlocks(): AdminBlock[] {
  return NONE;
}

function watchBlocks(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

/**
 * Track the cards on the page and which one is being read.
 *
 * `offset` is the height of the sticky header — the line below which a card
 * counts as the current one.
 */
export function useAdminBlocks(offset: number) {
  const blocks = useSyncExternalStore(watchBlocks, readBlocks, noBlocks);
  const [active, setActive] = useState("");

  useEffect(() => {
    if (blocks.length === 0) return;
    let frame = 0;
    const pick = () => {
      frame = 0;
      const line = offset + 24;
      let current = blocks[0].id;
      for (const b of blocks) {
        const el = document.getElementById(b.id);
        if (el && el.getBoundingClientRect().top <= line) current = b.id;
      }
      // The last card may be too short to ever cross the line; at the bottom of
      // the page it is nonetheless the one being read.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      setActive(atBottom ? blocks[blocks.length - 1].id : current);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(pick);
    };
    // A timer, not a frame, for the first reading: frames are not served to a
    // tab in the background, and the rail should be right when it comes back.
    const first = window.setTimeout(pick, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.clearTimeout(first);
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [blocks, offset]);

  const goTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    // `scroll-behavior: smooth` on <html> and the card's own scroll margin (set
    // from the header height) do the rest.
    el.scrollIntoView({ block: "start" });
    setActive(id);
  }, []);

  return { blocks, active, goTo };
}

/* -------------------------------------------------------------------------- */
/* The two ways of showing the list                                           */
/* -------------------------------------------------------------------------- */

/** Sticky rail, from `lg` up — where there is room beside the editor column. */
export function BlockRail({
  blocks,
  active,
  onGo,
}: {
  blocks: AdminBlock[];
  active: string;
  onGo: (id: string) => void;
}) {
  return (
    // The rail keeps its width even before the blocks have been read, so the
    // editor column does not jump about between tabs or on hydration.
    <nav aria-label="Bloques del editor" className="hidden w-52 shrink-0 lg:block">
      <div className="sticky" style={{ top: "calc(var(--admin-top, 6rem) + 1rem)" }}>
        <p className="px-3 pb-2 text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
          Bloques
        </p>
        <ul className="grid gap-0.5">
          {blocks.map((b) => (
            <li key={b.id}>
              <button
                type="button"
                onClick={() => onGo(b.id)}
                aria-current={active === b.id ? "true" : undefined}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-sm leading-snug transition ${
                  active === b.id
                    ? "bg-black/[0.07] font-semibold text-[#1d1d1f] dark:bg-white/15 dark:text-white"
                    : "text-neutral-500 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10"
                }`}
              >
                {b.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** The same list as a one-line picker, for screens with no room for the rail. */
export function BlockPicker({
  blocks,
  active,
  onGo,
}: {
  blocks: AdminBlock[];
  active: string;
  onGo: (id: string) => void;
}) {
  if (blocks.length === 0) return null;
  return (
    <label className="mx-auto flex max-w-6xl items-center gap-2 px-4 pb-2 lg:hidden">
      <span className="text-xs font-medium text-neutral-400">Ir a</span>
      <select
        aria-label="Ir a un bloque del editor"
        value={active}
        onChange={(e) => onGo(e.target.value)}
        className="min-w-0 flex-1 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-medium outline-none dark:border-white/15 dark:bg-black/40"
      >
        {blocks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))}
      </select>
    </label>
  );
}
