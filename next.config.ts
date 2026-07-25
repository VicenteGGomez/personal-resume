import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Profile photos are allowed up to 5 MB (see saveImage). The Server
      // Actions body limit defaults to 1 MB, which silently rejects larger
      // uploads before the action runs — keep the two limits in sync.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
