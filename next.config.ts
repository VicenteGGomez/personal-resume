import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Profile photos are allowed up to 5 MB (see saveImage). The Server
      // Actions body limit defaults to 1 MB, which silently rejects larger
      // uploads before the action runs — keep the two limits in sync.
      bodySizeLimit: "5mb",
    },
  },
  async rewrites() {
    // /cv and /cv-es are a short notice page (the CV's date) that then opens
    // the PDF. Only a browser asking for a page gets the notice: anything else
    // — curl, crawlers, an AI following the link — is handed the PDF itself,
    // as those URLs always did. `rsc` keeps client navigations on the page.
    const pdfUnlessPage = (source: string) => ({
      source,
      destination: `${source}/pdf`,
      missing: [
        { type: "header" as const, key: "accept", value: ".*text/html.*" },
        { type: "header" as const, key: "rsc" },
      ],
    });
    return {
      beforeFiles: [pdfUnlessPage("/cv"), pdfUnlessPage("/cv-es")],
      afterFiles: [],
      fallback: [],
    };
  },
};

// BotID (see instrumentation-client.ts) needs its challenge script proxied
// through this domain; the wrapper appends those rewrites to the ones above.
export default withBotId(nextConfig);
