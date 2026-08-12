import { redirect } from "next/navigation";

// Projects and publications now share the "More about me" page; send the old
// projects listing there (individual project pages live at /en/projects/[slug]).
export default function ProjectsListRedirect() {
  redirect("/en/more#projects");
}
