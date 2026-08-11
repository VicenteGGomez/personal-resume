import { getResumeData } from "@/lib/resume-store";
import { serveCv } from "@/lib/serve-cv";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { shared } = await getResumeData();
  return serveCv(request, shared.cvEn, "CV-Vicente-Gomez.pdf");
}
