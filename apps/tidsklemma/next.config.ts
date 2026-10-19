import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@hjem/ui", "@hjem/db"],
};

export default nextConfig;
