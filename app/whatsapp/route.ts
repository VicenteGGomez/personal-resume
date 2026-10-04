import { seedResumeData } from "@/lib/resume-content";
import { getResumeData } from "@/lib/resume-store";
import { trackedRedirect } from "@/lib/tracked-redirect";

export const dynamic = "force-dynamic";

// `/whatsapp?src=…` — opens a chat with you, counted on the way through.
export async function GET(request: Request) {
  const { shared } = await getResumeData();
  const number = (shared.whatsapp || seedResumeData.shared.whatsapp).replace(/\D/g, "");
  return trackedRedirect(request, "/whatsapp", `https://wa.me/${number}`);
}
