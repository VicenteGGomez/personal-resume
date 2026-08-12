import { redirect } from "next/navigation";

// Publications now live in the "More about me" page's #publications section.
export default function PublicationsRedirect() {
  redirect("/en/more#publications");
}
