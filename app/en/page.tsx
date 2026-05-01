import type { Metadata } from "next";
import ResumePage from "@/components/ResumePage";

export const metadata: Metadata = {
  title: "Vicente G. Gómez | Resume",
  description:
    "Economics student at Universidad de Chile, Capital Management Intern at Banco Santander, and Teaching Assistant.",
  alternates: {
    canonical: "/en",
    languages: {
      en: "/en",
      es: "/es",
    },
  },
};

export default function EnglishPage() {
  return <ResumePage lang="en" />;
}