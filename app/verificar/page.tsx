import type { Metadata } from "next";
import { VerifyLanding } from "@/components/VerifyPages";

export const metadata: Metadata = {
  title: "Verificar un documento",
  description:
    "Comprueba que un documento firmado por Vicente G. Gómez es auténtico y no fue modificado.",
  alternates: { languages: { en: "/verify", es: "/verificar" } },
};

export default function Page() {
  return <VerifyLanding lang="es" />;
}
