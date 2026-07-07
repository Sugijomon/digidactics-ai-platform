import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    cpus: 1,
    middlewareClientMaxBodySize: "60mb",
    serverActions: {
      bodySizeLimit: "60mb",
    },
  },
  transpilePackages: [
    "@digidactics/auth",
    "@digidactics/database",
    "@digidactics/domain",
  ],
};

export default nextConfig;
