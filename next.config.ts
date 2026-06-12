import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
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

