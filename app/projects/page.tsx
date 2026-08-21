import { redirect } from "next/navigation";

// Projects live in the résumé's "More about me" block now.
export default function ProjectsRedirect() {
  redirect("/en#projects");
}
