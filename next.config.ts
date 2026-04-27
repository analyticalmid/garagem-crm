import type { NextConfig } from "next";

const deployTarget = process.env.DEPLOY_TARGET;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    if (deployTarget === "landing") {
      return [
        {
          source: "/",
          destination: "/landing.html",
        },
      ];
    }

    return [];
  },
};

export default nextConfig;
