import { redirect } from "next/navigation";

// Las publicaciones ahora son una sección del propio CV, en ambos idiomas.
export default function PublicacionesRedirect() {
  redirect("/es#publications");
}
