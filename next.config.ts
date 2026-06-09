import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "8mb"
    }
  },
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
