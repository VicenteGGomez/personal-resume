import { seedResumeData } from "@/lib/resume-content";
import { getResumeData } from "@/lib/resume-store";
import { trackedRedirect } from "@/lib/tracked-redirect";

export const dynamic = "force-dynamic";

// `/linkedin?src=…` — a LinkedIn link that can be counted: share this instead
// of the profile URL and the visit shows up under its tag in /admin/stats.
export async function GET(request: Request) {
  const { shared } = await getResumeData();
  const profile = shared.linkedin || seedResumeData.shared.linkedin;
  return trackedRedirect(request, "/linkedin", profile);
}
