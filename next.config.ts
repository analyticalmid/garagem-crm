import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/",
        destination: "/landing.html",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/landing.html",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
