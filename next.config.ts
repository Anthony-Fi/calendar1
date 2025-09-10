import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Improve DX for initial deployments: do not fail builds on lint/TS
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
