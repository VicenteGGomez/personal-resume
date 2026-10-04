import { CLASES_URL } from "@/lib/qr-shortcuts";
import { trackedRedirect } from "@/lib/tracked-redirect";

export const dynamic = "force-dynamic";

// `/clases?src=…` — the classes site, counted here before leaving.
export async function GET(request: Request) {
  return trackedRedirect(request, "/clases", CLASES_URL);
}
