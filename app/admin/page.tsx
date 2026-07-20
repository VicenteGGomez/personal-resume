import type { Metadata } from "next";
import AdminLogin from "@/components/AdminLogin";
import AdminEditor from "@/components/AdminEditor";
import { getSession } from "@/lib/auth";
import { getResumeData, storageMode } from "@/lib/resume-store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    return <AdminLogin />;
  }

  const data = await getResumeData();
  return <AdminEditor initialData={data} email={session.email} mode={storageMode()} />;
}
