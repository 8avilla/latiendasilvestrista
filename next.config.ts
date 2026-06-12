import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ridus.blob.core.windows.net",
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;

