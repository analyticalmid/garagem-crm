import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/",            destination: "/landing.html"      },
      { source: "/privacidade", destination: "/privacidade.html"  },
      { source: "/termos",      destination: "/termos.html"       },
    ];
  },
  async redirects() {
    return [
      { source: "/landing.html",     destination: "/",            permanent: true },
      { source: "/privacidade.html", destination: "/privacidade", permanent: true },
      { source: "/termos.html",      destination: "/termos",      permanent: true },
    ];
  },
};

export default nextConfig;
