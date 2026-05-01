import type { Metadata } from "next";
import ResumePage from "@/components/ResumePage";

export const metadata: Metadata = {
  title: "Vicente G. Gómez | CV",
  description:
    "Estudiante de Economía en la Universidad de Chile, practicante en Gestión de Capital en Banco Santander y ayudante docente.",
  alternates: {
    canonical: "/es",
    languages: {
      en: "/en",
      es: "/es",
    },
  },
};

export default function SpanishPage() {
  return <ResumePage lang="es" />;
}