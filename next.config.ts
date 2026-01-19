import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // Allow local images even if they don't exist (for placeholders)
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
