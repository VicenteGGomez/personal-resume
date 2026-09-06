import { redirect } from "next/navigation";

// A short address to hand out; the story itself is per-language, and English is
// where an unqualified link lands, as it does at the root of the site.
export default function StoryRedirect() {
  redirect("/en/story");
}
