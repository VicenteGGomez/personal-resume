import { redirect } from "next/navigation";

// Publications are a section of the résumé itself now.
export default function PublicationsRedirect() {
  redirect("/en#publications");
}
