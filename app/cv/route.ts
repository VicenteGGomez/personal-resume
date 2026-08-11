import { NextResponse } from "next/server";
import { getResumeData } from "@/lib/resume-store";

// Always resolve against the latest stored CV URL.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { shared } = await getResumeData();
  const target = shared.cvEn;
  if (!target) {
    return new NextResponse("CV no disponible.", { status: 404 });
  }
  // `new URL(target, request.url)` handles both absolute (blob) and relative
  // (repo-static / local upload) targets.
  return NextResponse.redirect(new URL(target, request.url), 307);
}
