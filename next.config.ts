import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días — imágenes de producto no cambian seguido
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [48, 96, 192, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ridus.blob.core.windows.net",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "interrapidisimo.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;

