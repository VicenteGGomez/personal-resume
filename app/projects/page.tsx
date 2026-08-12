import { redirect } from "next/navigation";

// Projects are English-only; send the bare /projects path to the "More" page.
export default function ProjectsRedirect() {
  redirect("/en/more#projects");
}
