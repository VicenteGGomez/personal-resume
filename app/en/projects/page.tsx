import { redirect } from "next/navigation";

// The projects listing is part of the résumé's "More about me" block now
// (individual project pages still live at /en/projects/[slug]).
export default function ProjectsListRedirect() {
  redirect("/en#projects");
}
