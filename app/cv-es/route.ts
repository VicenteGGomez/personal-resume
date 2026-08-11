import { NextResponse } from "next/server";
import { getResumeData } from "@/lib/resume-store";

// Always resolve against the latest stored CV URL.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { shared } = await getResumeData();
  // When the "use English CV for Spanish" toggle is on, serve the English PDF.
  const target = shared.cvEsUseEn ? shared.cvEn : shared.cvEs;
  if (!target) {
    return new NextResponse("CV no disponible.", { status: 404 });
  }
  return NextResponse.redirect(new URL(target, request.url), 307);
}
