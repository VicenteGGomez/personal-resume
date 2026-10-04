import { after } from "next/server";
import { trackBot } from "@/lib/analytics-server";
import { getResumeData } from "@/lib/resume-store";
import { serveCv } from "@/lib/serve-cv";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

// The PDF behind the /cv notice. Clients that don't ask for a web page (curl,
// crawlers, an AI reading the site) are rewritten straight here by proxy.ts.
export async function GET(request: Request) {
  const { shared } = await getResumeData();
  // A person opening the CV goes through the notice first, which reports the
  // open and comes back here with `?via=notice`. Anything else — a link
  // scanner, a monitor, curl, an AI reading the link — still gets the PDF, but
  // only counts in the bot counter.
  if (new URL(request.url).searchParams.get("via") !== "notice") {
    after(() => trackBot(request, "pdf"));
  }
  return serveCv(request, shared.cvEn, "CV-Vicente-Gomez.pdf");
}
