import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@digidactics/database", "@digidactics/domain"],
};

export default nextConfig;
