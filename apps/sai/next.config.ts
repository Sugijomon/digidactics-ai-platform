import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@digidactics/domain", "@digidactics/database"],
};

export default nextConfig;
