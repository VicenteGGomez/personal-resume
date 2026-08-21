import { redirect } from "next/navigation";

/**
 * Projects and publications moved into the résumé itself (see MoreSections), so
 * this path only forwards the links already out in the world — including the
 * `?highlight=<post-id>` deep links this page used to serve, which become the
 * `#pub-<post-id>` anchor of the publication card.
 */
export default async function MoreRedirect({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string | string[] }>;
}) {
  const { highlight } = await searchParams;
  const id = Array.isArray(highlight) ? highlight[0] : highlight;
  redirect(id ? `/en#pub-${id}` : "/en#more");
}
