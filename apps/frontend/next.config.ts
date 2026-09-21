import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Production Cloudflare Worker must call the public backend URL.
    // Docker keeps using BACKEND_INTERNAL_URL so the local stack is unchanged.
    const backendUrl =
      process.env.BACKEND_PUBLIC_URL ??
      process.env.BACKEND_INTERNAL_URL ??
      "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
};

export default nextConfig;
