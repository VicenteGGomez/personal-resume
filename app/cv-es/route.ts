import { getResumeData } from "@/lib/resume-store";
import { serveCv } from "@/lib/serve-cv";

// Always resolve against the latest stored CV.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { shared } = await getResumeData();
  // When the "use English CV for Spanish" toggle is on, serve the English PDF.
  const useEn = shared.cvEsUseEn;
  const target = useEn ? shared.cvEn : shared.cvEs;
  const name = useEn ? "CV-Vicente-Gomez.pdf" : "CV-Vicente-Gomez-ES.pdf";
  return serveCv(request, target, name);
}
