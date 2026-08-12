"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Cookie-less visit tracker for the public pages.
 *
 * Mounted once in the root layout, it reports three things to `/api/track`:
 *   - a page view per navigation, tagged with `?src=` (or the referrer);
 *   - clicks on outbound links (WhatsApp, e-mail, LinkedIn, publications);
 *   - how far down the page the visitor got, and how long they stayed.
 *
 * It stores nothing in the browser except the `?src=` tag for the current tab,
 * so attribution survives navigation inside the site. CV downloads are counted
 * server-side instead (see `app/cv/route.ts`), which also catches ad blockers.
 */

const ENDPOINT = "/api/track";
const SRC_KEY = "resume:src";

interface Payload {
  kind: "view" | "event";
  name?: string;
  path: string;
  src: string;
  ref: string;
}

function send(payload: Payload): void {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    // sendBeacon can throw when the payload type is refused; fall through.
  }
  void fetch(ENDPOINT, {
    method: "POST",
    body,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => undefined);
}

/** The campaign tag for this tab: `?src=` / `?utm_source=`, remembered once. */
function currentSource(): string {
  let stored = "";
  try {
    stored = sessionStorage.getItem(SRC_KEY) ?? "";
  } catch {
    // Private mode / storage disabled — attribution just won't persist.
  }
  const params = new URLSearchParams(window.location.search);
  const fresh = params.get("src") ?? params.get("utm_source") ?? "";
  if (fresh) {
    try {
      sessionStorage.setItem(SRC_KEY, fresh);
    } catch {
      // ignore
    }
    return fresh;
  }
  return stored;
}

/** Event name for an outbound click, or `null` when it isn't worth counting. */
function outboundEvent(anchor: HTMLAnchorElement): string | null {
  const raw = anchor.getAttribute("href") ?? "";
  if (raw.startsWith("mailto:")) return "contact:email";
  if (raw.startsWith("tel:")) return "contact:phone";

  let url: URL;
  try {
    url = new URL(anchor.href, window.location.href);
  } catch {
    return null;
  }
  // Internal links already produce a page view; `/cv` is counted server-side.
  if (url.origin === window.location.origin) return null;

  const host = url.hostname.replace(/^www\./, "");
  if (host === "wa.me" || host.endsWith("whatsapp.com")) return "contact:whatsapp";
  if (host.endsWith("linkedin.com")) {
    return url.pathname.startsWith("/in/") ? "contact:linkedin" : "publication:open";
  }
  if (host === "github.com") return "contact:github";
  return `out:${host}`;
}

function scrollDepth(): number {
  const doc = document.documentElement;
  const scrollable = doc.scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 100;
  const ratio = (window.scrollY / scrollable) * 100;
  if (ratio >= 90) return 100;
  if (ratio >= 75) return 75;
  if (ratio >= 50) return 50;
  if (ratio >= 25) return 25;
  return 0;
}

function dwellBucket(seconds: number): string {
  if (seconds < 10) return "0-10";
  if (seconds < 30) return "10-30";
  if (seconds < 60) return "30-60";
  return "60plus";
}

/** Suppresses the duplicate view React StrictMode causes in development. */
let lastTrackedPath = "";

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    // The editor is yours: never counted, and it shouldn't ping on every save.
    if (!pathname || pathname.startsWith("/admin")) return;

    const src = currentSource();
    const base = { path: pathname, src, ref: document.referrer };

    if (lastTrackedPath !== pathname) {
      lastTrackedPath = pathname;
      send({ kind: "view", ...base });
    }

    let deepest = scrollDepth();
    const startedAt = Date.now();
    let closed = false;

    const onScroll = () => {
      const depth = scrollDepth();
      if (depth > deepest) deepest = depth;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;
      const name = outboundEvent(anchor as HTMLAnchorElement);
      if (name) send({ kind: "event", name, ...base });
    };

    /** Fired when the page goes away: one beacon with depth and dwell time. */
    const onLeave = () => {
      if (closed) return;
      closed = true;
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      send({ kind: "event", name: `scroll:${deepest}`, ...base });
      send({ kind: "event", name: `dwell:${dwellBucket(seconds)}`, ...base });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);

    return () => {
      // A client-side navigation ends this page's visit too.
      onLeave();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [pathname]);

  return null;
}
