import { initBotId } from "botid/client/core";

/**
 * Vercel BotID: an invisible check, no captcha. It tags the tracker's requests
 * so `app/api/track/route.ts` can tell a real browser from a headless one, and
 * a bot's visit lands in the "bots filtrados" counter instead of the stats.
 * Nothing on the site is blocked: crawlers and AI readers still get every page
 * and the PDF, they just aren't counted as people.
 */
initBotId({
  protect: [{ path: "/api/track", method: "POST" }],
});
