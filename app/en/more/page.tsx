import type { Metadata } from "next";
import MorePage from "@/components/MorePage";
import { getResumeData } from "@/lib/resume-store";

// Always render with the latest edited content.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { shared } = await getResumeData();
  const title = "More about me";
  const description = `Projects and writing by ${shared.name} — selected work and LinkedIn posts.`;
  return {
    title,
    description,
    alternates: { canonical: "/en/more" },
    openGraph: {
      title: `${title} · ${shared.name}`,
      description,
      url: "/en/more",
      locale: "en_US",
      images: shared.photoUrl ? [{ url: shared.photoUrl }] : undefined,
    },
  };
}

export default async function EnglishMorePage() {
  const data = await getResumeData();
  return <MorePage data={data} />;
}
