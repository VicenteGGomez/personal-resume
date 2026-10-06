import type { Metadata } from "next";
import { VerifyLanding } from "@/components/VerifyPages";

export const metadata: Metadata = {
  title: "Verify a document",
  description:
    "Check that a document signed by Vicente G. Gómez is authentic and unchanged.",
  alternates: { languages: { en: "/verify", es: "/verificar" } },
};

export default function Page() {
  return <VerifyLanding lang="en" />;
}
