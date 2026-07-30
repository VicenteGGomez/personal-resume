import { redirect } from "next/navigation";

// Projects are English-only; send the bare /projects path to the real page.
export default function ProjectsRedirect() {
  redirect("/en/projects");
}
