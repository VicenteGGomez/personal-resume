import { redirect } from "next/navigation";

// Publications live on the English-only "More about me" page now.
export default function PublicacionesRedirect() {
  redirect("/en/more#publications");
}
