"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/**
 * Vercel's analytics, minus the secret in a signer's link: /sign/<doc>/<token>
 * is reported as /sign, so the token never reaches a third party.
 */

const redact = <T extends { url: string }>(event: T): T => {
  const url = new URL(event.url);
  if (!url.pathname.startsWith("/sign/")) return event;
  return { ...event, url: `${url.origin}/sign` };
};

export default function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={redact} />
      <SpeedInsights beforeSend={redact} />
    </>
  );
}
