import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.0.149"],
  experimental: {
    serverActions: {
      bodySizeLimit: "1.2mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/account-avatars/**",
      },
    ],
    localPatterns: [
      {
        pathname: "/**",
        search: "",
      },
      {
        pathname: "/societa/**",
      },
    ],
  },
};

export default nextConfig;
