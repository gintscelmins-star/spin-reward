import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/lambda',
    '@remotion/renderer',
    '@remotion/cli',
    'remotion',
  ],
};

export default nextConfig;
