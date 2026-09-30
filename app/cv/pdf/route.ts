import { after } from "next/server";
import { track } from "@/lib/analytics-server";
import { getResumeData } from "@/lib/resume-store";
import { serveCv } from "@/lib/serve-cv";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

// The PDF behind the /cv notice. Clients that don't ask for a web page (curl,
// crawlers, an AI reading the site) are rewritten straight here by proxy.ts.
export async function GET(request: Request) {
  const { shared } = await getResumeData();
  // Counted here rather than in the browser, so ad blockers can't hide it —
  // unless the notice already counted this open (see app/cv/page.tsx).
  const params = new URL(request.url).searchParams;
  if (params.get("via") !== "notice") {
    const src = params.get("src") ?? undefined;
    after(() => track(request, { kind: "event", name: "cv:en", path: "/cv", src }));
  }
  return serveCv(request, shared.cvEn, "CV-Vicente-Gomez.pdf");
}
